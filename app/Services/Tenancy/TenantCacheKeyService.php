<?php

namespace App\Services\Tenancy;

class TenantCacheKeyService
{
    public function key(string $key): string
    {
        abort_unless(tenancy()->initialized && tenant(), 500, 'Tenant cache keys require an initialized tenant.');

        return 'tenant:'.tenant()->getTenantKey().':'.ltrim($key, ':');
    }
}
