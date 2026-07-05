<?php

namespace App\Contracts\SaaS;

use App\Models\Central\Tenant;

interface TenantDatabaseProvisioner
{
    public function provision(Tenant $tenant): void;

    public function destroy(Tenant $tenant): void;

    public function available(): bool;

    public function diagnostic(): string;
}
