<?php

namespace App\Services\SaaS\DatabaseProvisioning;

use App\Contracts\SaaS\TenantDatabaseProvisioner;

class DatabaseProvisionerManager
{
    public function __construct(private TenantDatabaseProvisionerFactory $factory) {}

    public function driver(?string $mode = null): TenantDatabaseProvisioner
    {
        // Existing installations keep their original provisioners. New records
        // use the explicit manual/mysql/cpanel contract.
        return match ($mode ?? config('saas.database.mode')) {
            'pool' => app(PoolDatabaseProvisioner::class),
            'automatic' => app(AutomaticDatabaseProvisioner::class),
            'cpanel_uapi' => app(CpanelUapiDatabaseProvisioner::class),
            default => $this->factory->make($mode),
        };
    }
}
