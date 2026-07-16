<?php

namespace App\Services\SaaS\DatabaseProvisioning;

use App\Models\Central\Tenant;
use Illuminate\Support\Facades\DB;

class TenantDatabaseConnectionVerifier
{
    public function __construct(private TenantDatabaseOwnershipMarker $ownership) {}

    public function createOrVerifyOwnership(Tenant $tenant, string $provisioner): void
    {
        $tenant->run(function () use ($tenant, $provisioner): void {
            DB::connection()->getPdo();
            $this->ownership->createOrVerify($tenant, $provisioner);
        });
    }

    public function verifyOwnership(Tenant $tenant): void
    {
        $tenant->run(function () use ($tenant): void {
            DB::connection()->getPdo();
            $this->ownership->verify($tenant);
        });
    }

    public function dropAllTablesAfterVerification(Tenant $tenant): void
    {
        $tenant->run(function () use ($tenant): void {
            DB::connection()->getPdo();
            $this->ownership->dropAllTablesAfterVerification($tenant);
        });
    }
}
