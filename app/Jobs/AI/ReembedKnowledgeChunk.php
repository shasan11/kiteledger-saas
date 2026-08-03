<?php

namespace App\Jobs\AI;

use App\Models\AiEmbedding;
use App\Models\AiKnowledgeChunk;
use App\Services\AI\Knowledge\AiKnowledgeChunkWriter;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ReembedKnowledgeChunk implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    public function __construct(public int $chunkId)
    {
        $this->onQueue('ai-embedding');
    }

    public function handle(AiKnowledgeChunkWriter $writer): void
    {
        $chunk = AiKnowledgeChunk::query()->find($this->chunkId);
        if (! $chunk) {
            return;
        }

        AiEmbedding::query()->where('knowledge_chunk_id', $chunk->id)->delete();
        $writer->write($chunk->only($chunk->getFillable()), true);
    }
}
