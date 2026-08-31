<?php

namespace App\Jobs\SaaS;

use App\Models\Central\Tenant;
use App\Services\SaaS\TenantProvisioningRunner;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProvisionTenantJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 280;

    public int $uniqueFor = 1800;

    public function __construct(public string $tenantId, public bool $retry = false)
    {
        $this->onConnection('central');
        $this->onQueue((string) config('saas.provisioning_queue', 'provisioning'));
    }

    public function uniqueId(): string
    {
        return $this->tenantId;
    }

    public function handle(TenantProvisioningRunner $runner): void
    {
        $runner->run(Tenant::query()->findOrFail($this->tenantId), $this->retry);
    }
}
