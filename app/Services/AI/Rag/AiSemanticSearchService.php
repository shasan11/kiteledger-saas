<?php

namespace App\Services\AI\Rag;

use App\Models\AiEmbedding;
use App\Neuron\VectorStore\MySqlVectorStore;
use App\Services\AI\AiProviderManager;
use App\Services\AI\AiSettingsService;

/**
 * Retrieval side of the RAG slice. Embeds the query, then ranks stored vectors
 * by cosine similarity in PHP — no external vector DB, works on plain MySQL.
 * Returns the matching SOURCE records (with snippets) so the caller can cite
 * them; it never invents figures.
 */
class AiSemanticSearchService
{
    public function __construct(
        private readonly AiProviderManager $provider,
        private readonly AiSettingsService $settings,
    ) {}

    /**
     * @return array<int, array{source_type: string, source_id: string, snippet: string, score: float}>
     */
    public function search(string $query, array $opts = []): array
    {
        $vector = $this->provider->embedOne(trim($query));

        return $this->searchByVector($vector, $opts);
    }

    /**
     * Provider-independent ranking — given a query vector, return the top matches.
     *
     * @param  array<int, float>  $vector
     * @return array<int, array{source_type: string, source_id: string, snippet: string, score: float}>
     */
    public function searchByVector(array $vector, array $opts = []): array
    {
        $dims = count($vector);
        if ($dims === 0) {
            return [];
        }

        $limit = max(1, min(20, (int) ($opts['limit'] ?? 5)));
        $branchId = $opts['branch_id'] ?? null;
        $minScore = (float) ($opts['min_score'] ?? 0.0);

        $query = AiEmbedding::query()->where('dims', $dims);

        $query->where('model', $opts['model'] ?? $this->settings->embeddingModel())
            ->where('provider', $opts['provider'] ?? $this->settings->embeddingProvider());

        if (! empty($opts['source_types'])) {
            $query->whereIn('source_type', (array) $opts['source_types']);
        }

        if ($branchId) {
            $query->where(function ($w) use ($branchId) {
                $w->where('branch_id', (string) $branchId)->orWhereNull('branch_id');
            });
        }

        if ($fiscalYearId = ($opts['fiscal_year_id'] ?? null)) {
            $query->where(function ($embeddingQuery) use ($fiscalYearId): void {
                $embeddingQuery->where('source_type', '!=', 'knowledge')
                    ->orWhereHas('knowledgeChunk', fn ($chunkQuery) => $chunkQuery
                        ->where(fn ($scope) => $scope
                            ->whereNull('fiscal_year_id')
                            ->orWhere('fiscal_year_id', (string) $fiscalYearId)));
            });
        }

        $scored = [];

        // Bound the PHP cosine pool for ordinary shared hosting. Exact/keyword
        // retrieval supplies the broad corpus; vectors rerank a recent subset.
        $pool = $query->orderByDesc('updated_at')
            ->limit(max(50, min($this->settings->ragMaxCandidatePool(), (int) ($opts['candidate_pool'] ?? $this->settings->ragCandidatePool()))))
            ->get();

        $pool->chunk(200)->each(function ($rows) use ($vector, &$scored, $minScore) {
            foreach ($rows as $row) {
                $score = self::cosine($vector, $row->vector ?? []);
                if ($score > $minScore) {
                    $scored[] = ['score' => $score, 'row' => $row];
                }
            }
        });

        usort($scored, fn ($a, $b) => $b['score'] <=> $a['score']);

        return array_map(fn ($s) => [
            'source_type' => $s['row']->source_type,
            'source_id' => $s['row']->source_id,
            'snippet' => (string) $s['row']->content,
            'score' => round($s['score'], 4),
        ], array_slice($scored, 0, $limit));
    }

    /**
     * Cosine similarity of two equal-length vectors.
     *
     * @param  array<int, float>  $a
     * @param  array<int, float>  $b
     */
    public static function cosine(array $a, array $b): float
    {
        return MySqlVectorStore::cosineSimilarity($a, $b);
    }
}
