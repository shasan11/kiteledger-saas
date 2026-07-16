<?php

namespace App\Services\SaaS\DatabaseProvisioning;

use App\Contracts\SaaS\TenantDatabaseProvisioner;
use App\Models\Central\Tenant;
use App\Models\Central\TenantDatabasePool;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PoolDatabaseProvisioner implements TenantDatabaseProvisioner
{
    public function __construct(
        private TenantDatabaseNameValidator $names,
        private TenantDatabaseConnectionVerifier $connections,
    ) {}

    public function provision(Tenant $tenant): void
    {
        DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($tenant): void {
            $entry = TenantDatabasePool::query()->where('tenant_id', $tenant->id)->lockForUpdate()->first()
                ?? TenantDatabasePool::query()->where('status', 'available')->whereNotNull('validated_at')->lockForUpdate()->first();
            if (! $entry) {
                throw new \RuntimeException('pool_exhausted');
            }

            $this->names->assertValid($entry->database_name);
            $entry->forceFill([
                'status' => 'allocated',
                'tenant_id' => $tenant->id,
                'ownership_tenant_id' => $tenant->id,
                'allocated_at' => $entry->allocated_at ?? now(),
                'released_at' => null,
            ])->save();
            $tenant->forceFill([
                'database_name' => $entry->database_name,
                'database_provisioning_mode' => 'pool',
                'database_username' => $entry->username,
                'database_password' => $entry->password,
                'database_ownership_id' => $tenant->database_ownership_id ?: (string) Str::uuid(),
            ]);
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
            $this->connections->createOrVerifyOwnership($tenant, 'pool');
            $tenant->forceFill(['provisioned_at' => now()])->save();
            TenantDatabasePool::where('tenant_id', $tenant->id)->update(['validated_at' => now(), 'last_error' => null]);
        } catch (\Throwable $e) {
            TenantDatabasePool::where('tenant_id', $tenant->id)->update(['status' => 'failed', 'last_error' => 'database_connection_failed']);
            throw new \RuntimeException('database_connection_failed', previous: $e);
        }
    }

    public function available(): bool
    {
        return TenantDatabasePool::query()->where('status', 'available')->whereNotNull('validated_at')->exists();
    }

    public function destroy(Tenant $tenant): void
    {
        $entry = TenantDatabasePool::where('tenant_id', $tenant->id)->where('database_name', $tenant->database()->getName())->firstOrFail();
        try {
            $this->connections->dropAllTablesAfterVerification($tenant);
        } catch (\Throwable $e) {
            $entry->update(['status' => 'failed', 'last_error' => str_contains($e->getMessage(), 'ownership_marker') ? $e->getMessage() : 'pool_database_cleanup_failed']);
            throw $e;
        }
        $entry->update([
            'status' => 'available',
            'tenant_id' => null,
            'allocated_at' => null,
            'released_at' => now(),
            'ownership_tenant_id' => null,
            'last_error' => null,
            'validated_at' => now(),
        ]);
    }

    public function diagnostic(): string
    {
        $count = TenantDatabasePool::query()->where('status', 'available')->whereNotNull('validated_at')->count();

        return $count ? "{$count} pre-created tenant database(s) available." : 'Add and validate a database in the tenant database pool.';
    }
}
