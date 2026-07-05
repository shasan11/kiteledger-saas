<?php

namespace App\Jobs\SaaS;

use App\Contracts\SaaS\BackupManager;
use App\Models\Central\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class BackupTenantJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 280;

    public function __construct(public string $tenantId) {}

    public function handle(BackupManager $backups): void
    {
        $backups->backupTenant(Tenant::findOrFail($this->tenantId));
    }
}
