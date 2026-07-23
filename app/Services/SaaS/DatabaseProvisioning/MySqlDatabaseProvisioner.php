<?php

namespace App\Services\SaaS\DatabaseProvisioning;

use App\Contracts\SaaS\TenantDatabaseProvisioner;
use App\Models\Central\Tenant;
use Illuminate\Support\Facades\DB;

class MySqlDatabaseProvisioner implements TenantDatabaseProvisioner
{
    public function provision(Tenant $tenant): void
    {
        abort_unless($this->available(), 500, 'The tenant_admin connection is not configured.');
        $database = (string) ($tenant->tenancy_db_name ?: $tenant->database_name);
        abort_unless((bool) preg_match('/^[a-zA-Z0-9_]{1,64}$/', $database), 422, 'Invalid tenant database name.');
        DB::connection('tenant_admin')->statement('CREATE DATABASE IF NOT EXISTS `'.str_replace('`', '``', $database).'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        $tenant->setInternal('db_connection', 'tenant_template');
        $tenant->setInternal('db_name', $database);
        $tenant->forceFill([
            'tenancy_db_connection' => 'tenant_template', 'tenancy_db_name' => $database,
            'tenancy_db_host' => config('database.connections.tenant_template.host'),
            'tenancy_db_port' => config('database.connections.tenant_template.port'),
            'tenancy_db_username' => config('database.connections.tenant_template.username'),
            'tenancy_db_password' => config('database.connections.tenant_template.password'),
            'database_name' => $database, 'database_provisioning_mode' => 'mysql',
            'database_created_by_app' => true,
        ])->save();
    }

    public function destroy(Tenant $tenant): void
    {
        abort_unless((bool) config('saas.allow_database_deletion'), 403, 'Tenant database deletion is disabled.');
        $database = (string) $tenant->tenancy_db_name;
        abort_unless($tenant->database_created_by_app && preg_match('/^[a-zA-Z0-9_]{1,64}$/', $database), 403);
        DB::connection('tenant_admin')->statement('DROP DATABASE `'.str_replace('`', '``', $database).'`');
    }

    public function available(): bool
    {
        return filled(config('database.connections.tenant_admin.username'));
    }

    public function diagnostic(): string
    {
        return $this->available() ? 'tenant_admin is configured.' : 'tenant_admin_not_configured';
    }
}
