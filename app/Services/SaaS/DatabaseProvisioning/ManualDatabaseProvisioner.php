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
            throw new \RuntimeException($this->failureCode($exception), previous: $exception);
        } finally {
            DB::purge($name);
        }
    }

    private function failureCode(\Throwable $exception): string
    {
        $message = strtolower($exception->getMessage());

        if (str_contains($message, 'sqlstate[hy000] [1049]') || str_contains($message, 'unknown database')) {
            return 'manual_database_not_found';
        }

        if (str_contains($message, 'sqlstate[hy000] [1045]') || str_contains($message, 'access denied for user')) {
            return 'manual_database_access_denied';
        }

        if (
            str_contains($message, 'create command denied')
            || str_contains($message, 'alter command denied')
            || str_contains($message, 'drop command denied')
            || str_contains($message, 'sqlstate[42000] [1044]')
            || str_contains($message, 'sqlstate[42000]: syntax error or access violation: 1142')
        ) {
            return 'manual_database_privilege_check_failed';
        }

        if (
            str_contains($message, 'sqlstate[hy000] [2002]')
            || str_contains($message, 'sqlstate[hy000] [2003]')
            || str_contains($message, 'connection refused')
            || str_contains($message, 'getaddrinfo')
        ) {
            return 'manual_database_connection_failed';
        }

        return 'manual_database_verification_failed';
    }

    public function destroy(Tenant $tenant): void
    {
        throw new \LogicException('Manually supplied tenant databases are never deleted by the application.');
    }

    public function available(): bool { return true; }

    public function diagnostic(): string { return 'Manual database credentials are verified during provisioning.'; }
}
