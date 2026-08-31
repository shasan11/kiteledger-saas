<?php

namespace App\Jobs;

use App\Services\Tenancy\TenantProvisioningService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProvisionTenant implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $uniqueFor = 1800;

    public function __construct(public array $attributes)
    {
        $this->onConnection('central')->onQueue((string) config('saas.provisioning_queue', 'provisioning'));
    }

    public function uniqueId(): string { return (string) ($this->attributes['slug'] ?? $this->attributes['subdomain'] ?? 'unknown'); }

    public function handle(TenantProvisioningService $service): void { $service->provision($this->attributes); }
}
