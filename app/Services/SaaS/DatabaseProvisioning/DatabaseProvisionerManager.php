<?php

namespace App\Services\SaaS\DatabaseProvisioning;

use App\Contracts\SaaS\TenantDatabaseProvisioner;

class DatabaseProvisionerManager
{
    public function driver(?string $mode = null): TenantDatabaseProvisioner
    {
        return match ($mode ?? config('saas.database.mode')) {
            'automatic' => app(AutomaticDatabaseProvisioner::class),
            'cpanel_uapi' => app(CpanelUapiDatabaseProvisioner::class),
            'pool' => app(PoolDatabaseProvisioner::class),
            default => throw new \RuntimeException('tenant_database_provisioning_mode_invalid'),
        };
    }
}
