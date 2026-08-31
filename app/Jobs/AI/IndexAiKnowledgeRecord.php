<?php

namespace App\Jobs\AI;

use App\Services\AI\AiDataVersionService;
use App\Services\AI\AiSettingsService;
use App\Services\AI\Knowledge\BusinessKnowledgeIndexer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class IndexAiKnowledgeRecord implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    public array $backoff = [10, 60, 180];

    public function __construct(public string $sourceType, public string $sourceId)
    {
        $this->onQueue('ai-index');
    }

    public function handle(BusinessKnowledgeIndexer $indexer, AiSettingsService $settings, AiDataVersionService $versions): void
    {
        $indexer->indexRecord($this->sourceType, $this->sourceId, $settings->supportsEmbeddings());
        $versions->bump();
    }

    public function failed(Throwable $exception): void
    {
        Log::error('AI incremental indexing failed.', [
            'source_type' => $this->sourceType,
            'source_id_hash' => hash('sha256', $this->sourceId),
            'exception' => $exception::class,
        ]);
    }
}
