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
        app(CentralNotificationService::class)->notifyOnce('tenant_suspended', 'tenants', 'warning', 'Tenant suspended', $tenant->company_name.' was suspended: '.$reason, route('central.tenants.show', $tenant), $tenant, [], 1);
    }

    public function reactivate(Tenant $tenant): void
    {
        $this->lifecycle->transition($tenant, TenantStatus::Active);
    }
}
