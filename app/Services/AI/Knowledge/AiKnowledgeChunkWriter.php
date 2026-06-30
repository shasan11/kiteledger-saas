<?php

namespace App\Services\AI\Knowledge;

use App\Models\AiEmbedding;
use App\Models\AiKnowledgeChunk;
use App\Services\AI\AiProviderManager;
use App\Services\AI\AiSettingsService;
use Throwable;

class AiKnowledgeChunkWriter
{
    public function __construct(
        private AiSettingsService $settings,
        private AiProviderManager $provider,
    ) {}

    /** @return array{created:int,updated:int,skipped:int,embeddings_created:int,embeddings_skipped:int,errors:int} */
    public function write(array $chunk, bool $embed = true): array
    {
        $stats = ['created' => 0, 'updated' => 0, 'skipped' => 0, 'embeddings_created' => 0, 'embeddings_skipped' => 0, 'errors' => 0];
        $content = trim((string) ($chunk['content'] ?? ''));
        $hash = hash('sha256', implode('|', [
            $chunk['title'] ?? '', $content, $chunk['route'] ?? '',
            json_encode($chunk['keywords'] ?? []), json_encode($chunk['metadata'] ?? []),
        ]));

        $record = AiKnowledgeChunk::query()->firstOrNew([
            'source_type' => $chunk['source_type'],
            'source_id' => (string) $chunk['source_id'],
        ]);
        $wasNew = ! $record->exists;

        if (! $wasNew && hash_equals((string) $record->content_hash, $hash)) {
            $stats['skipped']++;
        } else {
            $record->fill($chunk + ['content_hash' => $hash]);
            $record->content_hash = $hash;
            $record->save();
            $stats[$wasNew ? 'created' : 'updated']++;
        }

        if (! $embed || ! $this->canEmbed()) {
            $stats['embeddings_skipped']++;

            return $stats;
        }

        $embeddingText = trim($record->title."\n".$record->content);
        $embedding = AiEmbedding::query()->where([
            'source_type' => 'knowledge',
            'source_id' => (string) $record->id,
        ])->first();

        if ($embedding && $embedding->content_hash === $hash && $embedding->model === $this->settings->embeddingModel()) {
            $stats['embeddings_skipped']++;

            return $stats;
        }

        try {
            $vector = $this->provider->embedOne($embeddingText);
            if ($vector === []) {
                $stats['embeddings_skipped']++;

                return $stats;
            }

            AiEmbedding::query()->updateOrCreate(
                ['source_type' => 'knowledge', 'source_id' => (string) $record->id],
                [
                    'branch_id' => $record->branch_id,
                    'content' => mb_substr($embeddingText, 0, 4000),
                    'content_hash' => $hash,
                    'vector' => $vector,
                    'dims' => count($vector),
                    'provider' => $this->settings->provider(),
                    'model' => $this->settings->embeddingModel(),
                ],
            );
            $stats['embeddings_created']++;
        } catch (Throwable) {
            $stats['errors']++;
        }

        return $stats;
    }

    private function canEmbed(): bool
    {
        return $this->settings->enabled()
            && $this->settings->supportsEmbeddings()
            && ($this->settings->provider() === 'ollama' || $this->settings->hasApiKey());
    }
}
