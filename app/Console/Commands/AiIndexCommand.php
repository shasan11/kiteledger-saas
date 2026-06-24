<?php

namespace App\Console\Commands;

use App\Models\AiEmbedding;
use App\Services\AI\AiSettingsService;
use App\Services\AI\Rag\AiEmbeddingIndexer;
use Illuminate\Console\Command;
use Throwable;

/**
 * Builds the AI semantic-search index. Designed for shared hosting (no queue
 * worker): run it on demand or from cron. Idempotent and resumable.
 */
class AiIndexCommand extends Command
{
    protected $signature = 'ai:index
        {--source= : Only index this source (invoice|journal_voucher|quotation|purchase_bill|expense|product|contact)}
        {--fresh : Delete existing embeddings for the targeted source(s) before reindexing}';

    protected $description = 'Build/update the AI semantic-search index (embeddings) over accounting text.';

    public function handle(AiSettingsService $settings, AiEmbeddingIndexer $indexer): int
    {
        if (! $settings->enabled()) {
            $this->error('AI is disabled in settings — enable it before indexing.');

            return self::FAILURE;
        }

        if (! $settings->supportsEmbeddings()) {
            $this->error("Provider '{$settings->provider()}' has no embeddings. Use openai, gemini, ollama, or openrouter.");

            return self::FAILURE;
        }

        if ($settings->provider() !== 'ollama' && ! $settings->hasApiKey()) {
            $this->error('No AI API key configured. Set it in AI Settings first.');

            return self::FAILURE;
        }

        @set_time_limit(0);

        $source = $this->option('source') ?: null;

        if ($this->option('fresh')) {
            $deleted = AiEmbedding::query()
                ->when($source, fn ($q) => $q->where('source_type', $source))
                ->delete();
            $this->warn("Cleared {$deleted} existing embedding(s)".($source ? " for '{$source}'" : '').'.');
        }

        $this->info("Indexing with {$settings->provider()} / {$settings->embeddingModel()} ...");

        try {
            $stats = $indexer->index($source, function (string $type, string $id, string $label) {
                $this->line("  • {$label}");
            });
        } catch (Throwable $e) {
            $this->error('Indexing failed: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->newLine();
        $this->info("Done. indexed={$stats['indexed']}  skipped={$stats['skipped']}  empty={$stats['empty']}");

        return self::SUCCESS;
    }
}
