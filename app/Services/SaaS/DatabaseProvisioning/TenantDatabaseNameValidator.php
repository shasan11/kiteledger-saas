<?php

namespace App\Services\SaaS\DatabaseProvisioning;

use App\Models\Central\Tenant;
use App\Models\Central\TenantDatabasePool;

class TenantDatabaseNameValidator
{
    public function assertValid(string $databaseName): void
    {
        if ($databaseName === '') {
            throw new \RuntimeException('database_name_invalid');
        }

        if (! preg_match('/^[A-Za-z0-9_]{1,64}$/', $databaseName)) {
            throw new \RuntimeException('database_name_invalid');
        }

        $centralDatabase = (string) config('database.connections.'.config('tenancy.database.central_connection', 'mysql').'.database');
        if ($centralDatabase !== '' && strcasecmp($databaseName, $centralDatabase) === 0) {
            throw new \RuntimeException('central_database_rejected');
        }
    }

    public function assertUnique(string $databaseName, ?string $tenantId = null): void
    {
        $this->assertValid($databaseName);

        $tenantExists = Tenant::query()
            ->when($tenantId, fn ($query) => $query->whereKeyNot($tenantId))
            ->where('database_name', $databaseName)
            ->exists();

        $poolExists = TenantDatabasePool::query()
            ->when($tenantId, fn ($query) => $query->where(function ($query) use ($tenantId): void {
                $query->whereNull('tenant_id')->orWhere('tenant_id', '!=', $tenantId);
            }))
            ->where('database_name', $databaseName)
            ->exists();

        if ($tenantExists || $poolExists) {
            throw new \RuntimeException('database_name_collision');
        }
    }
}
