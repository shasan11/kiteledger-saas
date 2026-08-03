<?php

declare(strict_types=1);

namespace App\Neuron\VectorStore;

use App\Models\AiEmbedding;
use App\Models\AiKnowledgeChunk;
use App\Services\AI\Copilot\CopilotContext;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;
use NeuronAI\RAG\Document;
use NeuronAI\RAG\VectorStore\VectorStoreInterface;
use Throwable;

final class MySqlVectorStore implements VectorStoreInterface
{
    public function __construct(
        private CopilotContext $context,
        private string $provider,
        private string $model,
        private int $topK = 8,
        private int $candidatePool = 800,
        private int $maxCandidatePool = 2000,
        private float $minimumScore = 0.05,
        private array $sourceTypes = [],
    ) {
        $this->topK = max(1, min(50, $this->topK));
        $this->maxCandidatePool = max(100, min(5000, $this->maxCandidatePool));
        $this->candidatePool = max(50, min($this->maxCandidatePool, $this->candidatePool));
    }

    public function addDocument(Document $document): VectorStoreInterface
    {
        $vector = self::normalizedVector($document->getEmbedding());
        if ($vector === []) {
            throw new InvalidArgumentException('A non-empty numeric embedding is required.');
        }

        $metadata = $document->metadata;
        $sourceType = mb_substr((string) $document->getSourceType(), 0, 60);
        $sourceId = mb_substr((string) $document->getSourceName(), 0, 191);
        $knowledgeChunkId = isset($metadata['knowledge_chunk_id']) ? (int) $metadata['knowledge_chunk_id'] : null;
        $contentHash = (string) ($metadata['content_hash'] ?? hash('sha256', $document->getContent()));

        AiEmbedding::query()->updateOrCreate(
            [
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'provider' => $this->provider,
                'model' => $this->model,
            ],
            [
                'knowledge_chunk_id' => $knowledgeChunkId,
                'branch_id' => $metadata['branch_id'] ?? $this->context->branchId,
                'content' => mb_substr(strip_tags($document->getContent()), 0, 12000),
                'content_hash' => $contentHash,
                'vector' => $vector,
                'dims' => count($vector),
            ],
        );

        return $this;
    }

    public function addDocuments(array $documents): VectorStoreInterface
    {
        foreach ($documents as $document) {
            if (! $document instanceof Document) {
                throw new InvalidArgumentException('Every vector-store item must be a Neuron Document.');
            }
            $this->addDocument($document);
        }

        return $this;
    }

    public function deleteBySource(string $sourceType, string $sourceName): VectorStoreInterface
    {
        return $this->deleteBy($sourceType, $sourceName);
    }

    public function deleteBy(string $sourceType, ?string $sourceName = null): VectorStoreInterface
    {
        AiEmbedding::query()
            ->where('source_type', $sourceType)
            ->when($sourceName !== null, fn ($query) => $query->where('source_id', $sourceName))
            ->delete();

        return $this;
    }

    public function similaritySearch(array $embedding): iterable
    {
        $queryVector = self::normalizedVector($embedding);
        if ($queryVector === []) {
            throw new InvalidArgumentException('A non-empty numeric query embedding is required.');
        }

        $query = AiEmbedding::query()
            ->with('knowledgeChunk')
            ->where('dims', count($queryVector))
            ->where('provider', $this->provider)
            ->where('model', $this->model);

        if ($this->sourceTypes !== []) {
            $query->whereIn('source_type', $this->sourceTypes);
        }

        if ($this->context->branchId) {
            $query->where(fn ($scope) => $scope->whereNull('branch_id')->orWhere('branch_id', $this->context->branchId));
        } elseif ($this->context->allowedBranchIds !== []) {
            $query->where(fn ($scope) => $scope->whereNull('branch_id')->orWhereIn('branch_id', $this->context->allowedBranchIds));
        } else {
            $query->whereNull('branch_id');
        }

        $rows = $query->orderByDesc('updated_at')->limit($this->candidatePool)->get();
        $documents = [];

        foreach ($rows as $row) {
            try {
                $vector = self::normalizedVector($row->vector ?? []);
                if (count($vector) !== count($queryVector)) {
                    continue;
                }

                $score = self::cosineSimilarity($queryVector, $vector);
                if ($score < $this->minimumScore) {
                    continue;
                }

                $chunk = $row->knowledgeChunk;
                if ($chunk && ! $this->chunkAllowed($chunk)) {
                    continue;
                }

                $document = new Document((string) $row->content);
                $document->id = $row->getKey();
                $document->embedding = $vector;
                $document->sourceType = (string) $row->source_type;
                $document->sourceName = (string) $row->source_id;
                $document->setScore($score);
                foreach ($this->metadata($row, $chunk) as $key => $value) {
                    $document->addMetadata($key, $value);
                }
                $documents[] = $document;
            } catch (Throwable $exception) {
                Log::warning('Malformed AI embedding skipped.', [
                    'embedding_id' => $row->getKey(),
                    'source_type' => $row->source_type,
                    'error' => $exception::class,
                ]);
            }
        }

        usort($documents, fn (Document $left, Document $right) => $right->getScore() <=> $left->getScore());

        return array_slice($documents, 0, $this->topK);
    }

    public static function cosineSimilarity(array $left, array $right): float
    {
        $left = self::normalizedVector($left);
        $right = self::normalizedVector($right);
        if ($left === [] || count($left) !== count($right)) {
            return 0.0;
        }

        $dot = $leftMagnitude = $rightMagnitude = 0.0;
        foreach ($left as $index => $value) {
            $other = $right[$index];
            $dot += $value * $other;
            $leftMagnitude += $value * $value;
            $rightMagnitude += $other * $other;
        }

        if ($leftMagnitude <= 0.0 || $rightMagnitude <= 0.0) {
            return 0.0;
        }

        return $dot / (sqrt($leftMagnitude) * sqrt($rightMagnitude));
    }

    private static function normalizedVector(array $vector): array
    {
        if ($vector === []) {
            return [];
        }

        $normalized = [];
        foreach ($vector as $value) {
            if (! is_numeric($value)) {
                return [];
            }
            $float = (float) $value;
            if (! is_finite($float)) {
                return [];
            }
            $normalized[] = $float;
        }

        return $normalized;
    }

    private function chunkAllowed(AiKnowledgeChunk $chunk): bool
    {
        if ($chunk->branch_id && ! in_array((string) $chunk->branch_id, $this->context->allowedBranchIds, true)) {
            return false;
        }
        if ($chunk->fiscal_year_id && $this->context->allowedFiscalYearIds !== [] && ! in_array((string) $chunk->fiscal_year_id, $this->context->allowedFiscalYearIds, true)) {
            return false;
        }

        return ! $chunk->permission || $this->context->hasPermission((string) $chunk->permission);
    }

    private function metadata(AiEmbedding $row, ?AiKnowledgeChunk $chunk): array
    {
        return array_filter([
            'knowledge_chunk_id' => $chunk?->getKey(),
            'title' => $chunk?->title,
            'module' => $chunk?->module,
            'route' => $chunk?->route,
            'permission' => $chunk?->permission,
            'branch_id' => $chunk?->branch_id ?? $row->branch_id,
            'fiscal_year_id' => $chunk?->fiscal_year_id,
            'source_key' => $chunk?->source_id,
            'metadata' => $chunk?->metadata ?? [],
        ], fn ($value) => $value !== null && $value !== '');
    }
}
