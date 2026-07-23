<?php

namespace App\Services\SaaS\DatabaseProvisioning;

use App\Contracts\SaaS\TenantDatabaseProvisioner;

class TenantDatabaseProvisionerFactory
{
    public function make(?string $mode = null): TenantDatabaseProvisioner
    {
        return match ($mode ?? config('saas.db_provisioning_mode')) {
            'manual', 'pool' => app(ManualDatabaseProvisioner::class),
            'mysql', 'automatic' => app(MySqlDatabaseProvisioner::class),
            'cpanel', 'cpanel_uapi' => app(CpanelUapiDatabaseProvisioner::class),
            default => throw new \InvalidArgumentException('Unsupported tenant database provisioning mode.'),
        };
    }
}
