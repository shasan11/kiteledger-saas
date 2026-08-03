<?php

namespace App\Jobs\AI;

use App\Services\AI\AiDataVersionService;
use App\Services\AI\Knowledge\BusinessKnowledgeIndexer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class DeleteAiKnowledgeRecord implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 60;

    public function __construct(public string $sourceType, public string $sourceId)
    {
        $this->onQueue('ai-index');
    }

    public function handle(BusinessKnowledgeIndexer $indexer, AiDataVersionService $versions): void
    {
        $indexer->deleteRecord($this->sourceType, $this->sourceId);
        $versions->bump();
    }
}
