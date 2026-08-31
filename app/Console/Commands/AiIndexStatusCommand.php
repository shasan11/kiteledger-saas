<?php

namespace App\Console\Commands;

use App\Models\AiEmbedding;
use App\Models\AiKnowledgeChunk;
use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class AiIndexStatusCommand extends Command
{
    protected $signature = 'ai:index-status {--tenant= : Initialize a tenant UUID or slug first}';

    protected $description = 'Show AI knowledge and embedding index status.';

    public function handle(): int
    {
        $initializedHere = false;
        try {
            if ($tenantKey = $this->option('tenant')) {
                $tenant = Tenant::query()->whereKey($tenantKey)->orWhere('slug', $tenantKey)->firstOrFail();
                tenancy()->initialize($tenant);
                $initializedHere = true;
            }

            if (! Schema::hasTable('ai_knowledge_chunks')) {
                $this->warn('Knowledge table is missing. Run tenant migrations first.');

                return self::FAILURE;
            }

            $rows = AiKnowledgeChunk::query()->selectRaw('source_type, COUNT(*) as chunks, MAX(updated_at) as last_indexed')
                ->groupBy('source_type')->orderBy('source_type')->get()
                ->map(fn ($row) => [
                    $row->source_type,
                    $row->chunks,
                    AiEmbedding::query()->where('source_type', 'knowledge')
                        ->whereIn('source_id', AiKnowledgeChunk::query()->where('source_type', $row->source_type)->select('id'))
                        ->count(),
                    $row->last_indexed ?: 'Never',
                ])->all();

            $this->table(['Source', 'Chunks', 'Embeddings', 'Last indexed'], $rows);
            $this->info('Total chunks: '.AiKnowledgeChunk::query()->count());

            return self::SUCCESS;
        } finally {
            if ($initializedHere && tenancy()->initialized) {
                tenancy()->end();
            }
        }
    }
}
