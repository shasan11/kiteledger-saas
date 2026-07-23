<?php

namespace App\Services\SaaS\DatabaseProvisioning;

use App\Contracts\SaaS\TenantDatabaseProvisioner;
use App\Models\Central\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ManualDatabaseProvisioner implements TenantDatabaseProvisioner
{
    public function provision(Tenant $tenant): void
    {
        $this->verify([
            'host' => $tenant->tenancy_db_host,
            'port' => $tenant->tenancy_db_port,
            'database' => $tenant->tenancy_db_name,
            'username' => $tenant->tenancy_db_username,
            'password' => $tenant->tenancy_db_password,
        ]);
        $tenant->setInternal('db_connection', 'tenant_template');
        $tenant->setInternal('db_name', $tenant->tenancy_db_name);
        $tenant->setInternal('db_host', $tenant->tenancy_db_host);
        $tenant->setInternal('db_port', $tenant->tenancy_db_port);
        $tenant->setInternal('db_username', $tenant->tenancy_db_username);
        $tenant->setInternal('db_password', $tenant->tenancy_db_password);
        $tenant->forceFill(['database_name' => $tenant->tenancy_db_name, 'database_provisioning_mode' => 'manual', 'database_created_by_app' => false])->save();
    }

    public function verify(array $credentials): void
    {
        $name = 'tenant_manual_'.Str::lower(Str::random(12));
        config(["database.connections.{$name}" => array_merge(config('database.connections.tenant_template'), [
            'host' => $credentials['host'], 'port' => $credentials['port'] ?: 3306,
            'database' => $credentials['database'], 'username' => $credentials['username'],
            'password' => $credentials['password'],
        ])]);
        $table = '_kiteledger_provision_probe_'.Str::lower(Str::random(10));
        try {
            $connection = DB::connection($name);
            $connection->statement("CREATE TABLE `{$table}` (`id` INT NOT NULL)");
            $connection->statement("ALTER TABLE `{$table}` ADD COLUMN `checked_at` TIMESTAMP NULL");
            $connection->statement("DROP TABLE `{$table}`");
        } catch (\Throwable $exception) {
            try { DB::connection($name)->statement("DROP TABLE IF EXISTS `{$table}`"); } catch (\Throwable) {}
            throw new \RuntimeException('manual_database_verification_failed', previous: $exception);
        } finally {
            DB::purge($name);
        }
    }

    public function destroy(Tenant $tenant): void
    {
        throw new \LogicException('Manually supplied tenant databases are never deleted by the application.');
    }

    public function available(): bool { return true; }

    public function diagnostic(): string { return 'Manual database credentials are verified during provisioning.'; }
}
