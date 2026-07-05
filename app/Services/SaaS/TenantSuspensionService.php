<?php

namespace App\Services\SaaS;

use App\Enums\TenantStatus;
use App\Models\Central\Tenant;

class TenantSuspensionService
{
    public function __construct(private TenantLifecycleService $lifecycle) {}

    public function suspend(Tenant $tenant, string $reason): void
    {
        $this->lifecycle->transition($tenant, TenantStatus::Suspended, $reason);
    }

    public function reactivate(Tenant $tenant): void
    {
        $this->lifecycle->transition($tenant, TenantStatus::Active);
    }
}
