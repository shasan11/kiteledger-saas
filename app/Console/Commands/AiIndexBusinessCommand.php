<?php

namespace App\Console\Commands;

use App\Services\AI\Knowledge\BusinessKnowledgeIndexer;
use Illuminate\Console\Command;
use Throwable;

class AiIndexBusinessCommand extends Command
{
    protected $signature = 'ai:index-business {--source= : Limit to one business source} {--no-embeddings : Build keyword index only}';

    protected $description = 'Index readable business record chunks for AI retrieval.';

    public function handle(BusinessKnowledgeIndexer $indexer): int
    {
        @set_time_limit(0);
        try {
            $stats = $indexer->index($this->option('source') ?: null, ! $this->option('no-embeddings'), fn ($title) => $this->line('  '.$title));
            $this->table(['Created', 'Updated', 'Skipped', 'Embeddings', 'Embedding skips', 'Errors'], [[
                $stats['created'], $stats['updated'], $stats['skipped'], $stats['embeddings_created'], $stats['embeddings_skipped'], $stats['errors'],
            ]]);

            return $stats['errors'] ? self::FAILURE : self::SUCCESS;
        } catch (Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }
    }
}
