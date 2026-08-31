<?php

namespace App\Jobs;

use App\Services\SaaS\TenantDatabaseService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class RunTenantSeeders implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    public function __construct(public string $tenantId) { $this->onConnection('central')->onQueue('platform-operations'); }
    public function uniqueId(): string { return 'seed:'.$this->tenantId; }
    public function handle(TenantDatabaseService $databases): void { $databases->seed(\App\Models\Central\Tenant::findOrFail($this->tenantId)); }
}
