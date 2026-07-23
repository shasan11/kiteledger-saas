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
        $provisioner = $this->provisioners->driver($tenant->database_provisioning_mode);
        if (! $provisioner->available()) {
            throw new \RuntimeException('tenant_database_provisioner_unavailable: '.$provisioner->diagnostic());
        }
        $provisioner->provision($tenant);
    }

    public function migrate(Tenant $tenant): void
    {
        try {
            $this->artisan('tenants:migrate', ['--tenants' => [$tenant->id], '--force' => true]);
        } catch (\Throwable $e) {
            throw new \RuntimeException('tenant_migration_failed', previous: $e);
        }
    }

    public function seed(Tenant $tenant): void
    {
        try {
            $this->artisan('tenants:seed', ['--tenants' => [$tenant->id], '--class' => 'Database\\Seeders\\TenantDatabaseSeeder', '--force' => true]);
        } catch (\Throwable $e) {
            throw new \RuntimeException('tenant_seeding_failed', previous: $e);
        }
    }

    private function artisan(string $command, array $arguments): void
    {
        if (Artisan::call($command, $arguments) !== 0) {
            throw new \RuntimeException(trim(Artisan::output()) ?: "{$command} failed.");
        }
    }
}
