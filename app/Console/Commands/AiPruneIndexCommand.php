<?php

namespace App\Console\Commands;

use App\Models\AiEmbedding;
use App\Models\AiKnowledgeChunk;
use App\Models\Tenant;
use App\Services\AI\Knowledge\BusinessKnowledgeIndexer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class AiPruneIndexCommand extends Command
{
    protected $signature = 'ai:prune-index {--tenant= : Initialize a tenant UUID or slug first}';

    protected $description = 'Remove orphaned embeddings and business chunks whose source records no longer exist.';

    public function handle(BusinessKnowledgeIndexer $indexer): int
    {
        $initializedHere = false;

        try {
            if ($tenantKey = $this->option('tenant')) {
                $tenant = Tenant::query()->whereKey($tenantKey)->orWhere('slug', $tenantKey)->firstOrFail();
                tenancy()->initialize($tenant);
                $initializedHere = true;
            }

            $embeddings = AiEmbedding::query()
                ->where('source_type', 'knowledge')
                ->whereNotIn('source_id', AiKnowledgeChunk::query()->selectRaw('CAST(id AS CHAR)'))
                ->delete();
            $chunks = 0;

            foreach ($indexer->sources() as $sourceType => $cfg) {
                if (! Schema::hasTable($cfg['table'])) {
                    continue;
                }
                AiKnowledgeChunk::query()->where('source_type', $sourceType)->orderBy('id')->chunkById(200, function ($records) use ($sourceType, $cfg, &$chunks): void {
                    foreach ($records as $chunk) {
                        $recordId = str_starts_with((string) $chunk->source_id, $sourceType.':')
                            ? substr((string) $chunk->source_id, strlen($sourceType) + 1)
                            : null;
                        if (! $recordId || ! DB::table($cfg['table'])->where('id', $recordId)->exists()) {
                            $chunk->embeddings()->delete();
                            $chunk->delete();
                            $chunks++;
                        }
                    }
                });
            }

            $this->info("Pruned {$embeddings} orphan embedding(s) and {$chunks} stale chunk(s).");

            return self::SUCCESS;
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        } finally {
            if ($initializedHere && tenancy()->initialized) {
                tenancy()->end();
            }
        }
    }
}
