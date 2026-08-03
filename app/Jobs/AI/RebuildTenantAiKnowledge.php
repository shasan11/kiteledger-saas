<?php

namespace App\Jobs\AI;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Artisan;

class RebuildTenantAiKnowledge implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 3600;

    public function __construct(public bool $embeddings = true)
    {
        $this->onQueue('ai-index');
    }

    public function handle(): void
    {
        Artisan::call('ai:index-all', $this->embeddings ? [] : ['--no-embeddings' => true]);
    }
}
