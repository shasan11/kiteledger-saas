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

    public function syncConnectionValues(Tenant $tenant): Tenant
    {
        $name = $tenant->tenancy_db_name ?: $tenant->database_name;
        $host = $tenant->tenancy_db_host ?: config('database.connections.tenant_template.host');
        $port = $tenant->tenancy_db_port ?: config('database.connections.tenant_template.port');
        $username = $tenant->tenancy_db_username ?: $tenant->database_username ?: config('database.connections.tenant_template.username');
        $password = $tenant->tenancy_db_password ?? $tenant->database_password ?? config('database.connections.tenant_template.password');

        if (blank($name) || blank($host) || blank($username)) {
            throw new \RuntimeException('database_connection_failed');
        }

        $tenant->forceFill([
            'tenancy_db_connection' => 'tenant_template',
            'tenancy_db_name' => $name,
            'tenancy_db_host' => $host,
            'tenancy_db_port' => $port,
            'tenancy_db_username' => $username,
            'tenancy_db_password' => $password,
            'database_name' => $name,
        ]);
        $tenant->setInternal('db_connection', 'tenant_template');
        $tenant->setInternal('db_name', $name);
        $tenant->setInternal('db_host', $host);
        $tenant->setInternal('db_port', $port);
        $tenant->setInternal('db_username', $username);
        $tenant->setInternal('db_password', $password);
        $tenant->save();

        return $tenant->refresh();
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
