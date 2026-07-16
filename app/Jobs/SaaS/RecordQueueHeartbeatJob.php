<?php

namespace App\Jobs\SaaS;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class RecordQueueHeartbeatJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 30;

    public function __construct()
    {
        $this->onConnection('central');
        $this->onQueue('default');
    }

    public function handle(): void
    {
        DB::connection(config('tenancy.database.central_connection'))
            ->table('saas_heartbeats')
            ->updateOrInsert(
                ['name' => 'queue'],
                [
                    'last_seen_at' => now(),
                    'metadata' => json_encode([
                        'connection' => $this->connection,
                        'queue' => $this->queue,
                        'host' => gethostname(),
                    ]),
                ],
            );
    }
}
