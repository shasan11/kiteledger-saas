<?php

namespace App\Services\SaaS\DatabaseProvisioning;

use App\Models\Central\Tenant;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class TenantDatabaseOwnershipMarker
{
    private const TABLE = 'kiteledger_tenant_identity';

    public function createOrVerify(Tenant $tenant, string $provisioner): void
    {
        $connection = DB::connection();
        $this->ensureTable($connection);

        $marker = $connection->table(self::TABLE)->first();
        if ($marker) {
            $this->assertMatches($tenant, (array) $marker);

            return;
        }

        $connection->table(self::TABLE)->insert([
            'tenant_id' => $tenant->id,
            'database_uuid' => (string) Str::uuid(),
            'provisioner' => $provisioner,
            'application' => 'kiteledger',
            'created_at' => now(),
        ]);
    }

    public function verify(Tenant $tenant): void
    {
        $connection = DB::connection();
        if (! Schema::connection($connection->getName())->hasTable(self::TABLE)) {
            throw new \RuntimeException('ownership_marker_missing');
        }

        $marker = $connection->table(self::TABLE)->first();
        if (! $marker) {
            throw new \RuntimeException('ownership_marker_missing');
        }

        $this->assertMatches($tenant, (array) $marker);
    }

    public function dropAllTablesAfterVerification(Tenant $tenant): void
    {
        $this->verify($tenant);
        DB::connection()->getSchemaBuilder()->dropAllTables();
    }

    private function ensureTable(ConnectionInterface $connection): void
    {
        if (Schema::connection($connection->getName())->hasTable(self::TABLE)) {
            return;
        }

        Schema::connection($connection->getName())->create(self::TABLE, function ($table): void {
            $table->id();
            $table->string('tenant_id');
            $table->uuid('database_uuid');
            $table->string('provisioner');
            $table->string('application');
            $table->timestamp('created_at')->nullable();
        });
    }

    private function assertMatches(Tenant $tenant, array $marker): void
    {
        if (($marker['tenant_id'] ?? null) !== $tenant->id || ($marker['application'] ?? null) !== 'kiteledger') {
            throw new \RuntimeException('ownership_marker_mismatch');
        }
    }
}
