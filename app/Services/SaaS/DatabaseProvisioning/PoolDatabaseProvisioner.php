<?php

namespace App\Services\SaaS\DatabaseProvisioning;

use App\Contracts\SaaS\TenantDatabaseProvisioner;
use App\Models\Central\Tenant;
use App\Models\Central\TenantDatabasePool;
use Illuminate\Support\Facades\DB;

class PoolDatabaseProvisioner implements TenantDatabaseProvisioner
{
    public function provision(Tenant $tenant): void
    {
        DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($tenant): void {
            $entry = TenantDatabasePool::query()->where('tenant_id', $tenant->id)->lockForUpdate()->first()
                ?? TenantDatabasePool::query()->where('status', 'available')->lockForUpdate()->first();
            if (! $entry) {
                throw new \RuntimeException('tenant_database_pool_exhausted');
            }

            $entry->forceFill(['status' => 'allocated', 'tenant_id' => $tenant->id])->save();
            $tenant->database_name = $entry->database_name;
            $tenant->setInternal('db_name', $entry->database_name);
            if ($entry->username) {
                $tenant->setInternal('db_username', $entry->username);
            }
            if ($entry->password) {
                $tenant->setInternal('db_password', $entry->password);
            }
            $tenant->save();
        });

        try {
            $tenant->run(fn () => DB::connection()->getPdo());
            TenantDatabasePool::where('tenant_id', $tenant->id)->update(['validated_at' => now(), 'last_error' => null]);
        } catch (\Throwable $e) {
            TenantDatabasePool::where('tenant_id', $tenant->id)->update(['status' => 'failed', 'last_error' => 'connection_failed']);
            throw new \RuntimeException('tenant_database_pool_connection_failed', previous: $e);
        }
    }

    public function available(): bool
    {
        return TenantDatabasePool::query()->where('status', 'available')->exists();
    }

    public function destroy(Tenant $tenant): void
    {
        $entry = TenantDatabasePool::where('tenant_id', $tenant->id)->where('database_name', $tenant->database()->getName())->firstOrFail();
        $tenant->run(fn () => DB::connection()->getSchemaBuilder()->dropAllTables());
        $entry->update(['status' => 'available', 'tenant_id' => null, 'validated_at' => null, 'last_error' => null]);
    }

    public function diagnostic(): string
    {
        $count = TenantDatabasePool::query()->where('status', 'available')->count();

        return $count ? "{$count} pre-created tenant database(s) available." : 'Add and validate a database in the tenant database pool.';
    }
}
