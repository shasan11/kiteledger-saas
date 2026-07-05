<?php

namespace App\Contracts\SaaS;

use App\Models\Central\Tenant;

interface FeatureResolver
{
    public function allows(Tenant $tenant, string $feature): bool;

    public function value(Tenant $tenant, string $feature, mixed $default = null): mixed;
}
