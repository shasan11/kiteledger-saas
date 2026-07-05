<?php

namespace App\Services\SaaS;

use App\Models\Central\Tenant;
use App\Services\SaaS\DatabaseProvisioning\DatabaseProvisionerManager;
use Illuminate\Support\Facades\Artisan;

class TenantDatabaseService
{
    public function __construct(private DatabaseProvisionerManager $provisioners) {}

    public function exists(Tenant $tenant): bool
    {
        try {
            return $tenant->database()->manager()->databaseExists($tenant->database_name);
        } catch (\Throwable) {
            return false;
        }
    }

    public function create(Tenant $tenant): void
    {
        $provisioner = $this->provisioners->driver();
        if (! $provisioner->available()) {
            throw new \RuntimeException('tenant_database_provisioner_unavailable: '.$provisioner->diagnostic());
        }
        $provisioner->provision($tenant);
    }

    public function migrate(Tenant $tenant): void
    {
        $this->artisan('tenants:migrate', ['--tenants' => [$tenant->id], '--force' => true]);
    }

    public function seed(Tenant $tenant): void
    {
        $this->artisan('tenants:seed', ['--tenants' => [$tenant->id], '--force' => true]);
    }

    private function artisan(string $command, array $arguments): void
    {
        if (Artisan::call($command, $arguments) !== 0) {
            throw new \RuntimeException(trim(Artisan::output()) ?: "{$command} failed.");
        }
    }
}
