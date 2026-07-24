<?php

namespace App\Services\SaaS\DatabaseProvisioning;

use App\Contracts\SaaS\TenantDatabaseProvisioner;

class TenantDatabaseProvisionerFactory
{
    public function make(?string $mode = null): TenantDatabaseProvisioner
    {
        return match ($mode ?? config('saas.db_provisioning_mode')) {
            'manual' => app(ManualDatabaseProvisioner::class),
            'pool' => app(PoolDatabaseProvisioner::class),
            'mysql' => app(MySqlDatabaseProvisioner::class),
            'automatic' => app(AutomaticDatabaseProvisioner::class),
            'cpanel', 'cpanel_uapi' => app(CpanelUapiDatabaseProvisioner::class),
            default => throw new \InvalidArgumentException('Unsupported tenant database provisioning mode.'),
        };
    }
}
