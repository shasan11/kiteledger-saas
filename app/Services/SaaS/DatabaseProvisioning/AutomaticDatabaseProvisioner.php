<?php

namespace App\Services\SaaS\DatabaseProvisioning;

use App\Contracts\SaaS\TenantDatabaseProvisioner;
use App\Models\Central\Tenant;
use Illuminate\Support\Facades\DB;
use Stancl\Tenancy\Jobs\CreateDatabase;

class AutomaticDatabaseProvisioner implements TenantDatabaseProvisioner
{
    public function provision(Tenant $tenant): void
    {
        $name = $tenant->database()->getName();
        if (! preg_match('/^[A-Za-z0-9_]+$/', $name) || strlen($name) > 64 || ! str_starts_with($name, config('tenancy.database.prefix'))) {
            throw new \RuntimeException('tenant_database_name_invalid');
        }
        if (! $tenant->database()->manager()->databaseExists($name)) {
            app()->call([new CreateDatabase($tenant), 'handle']);
        }
    }

    public function available(): bool
    {
        try {
            $grants = DB::connection(config('tenancy.database.central_connection'))->select('SHOW GRANTS');

            return str_contains(strtoupper(json_encode($grants)), 'CREATE');
        } catch (\Throwable) {
            return false;
        }
    }

    public function destroy(Tenant $tenant): void
    {
        $name = $tenant->database()->getName();
        if (! str_starts_with($name, config('tenancy.database.prefix')) || ! preg_match('/^[A-Za-z0-9_]{1,64}$/', $name)) {
            throw new \RuntimeException('tenant_database_name_invalid');
        }
        if ($tenant->database()->manager()->databaseExists($name)) {
            $tenant->database()->manager()->deleteDatabase($tenant);
        }
    }

    public function diagnostic(): string
    {
        return $this->available() ? 'CREATE DATABASE privilege appears available.' : 'The database user does not expose CREATE DATABASE privilege.';
    }
}
