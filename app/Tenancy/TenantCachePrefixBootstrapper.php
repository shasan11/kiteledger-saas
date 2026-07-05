<?php

namespace App\Tenancy;

use Illuminate\Contracts\Cache\Factory;
use Stancl\Tenancy\Contracts\TenancyBootstrapper;
use Stancl\Tenancy\Contracts\Tenant;

class TenantCachePrefixBootstrapper implements TenancyBootstrapper
{
    private ?string $originalPrefix = null;

    public function __construct(private Factory $cache) {}

    public function bootstrap(Tenant $tenant): void
    {
        $store = $this->cache->store()->getStore();
        if (! method_exists($store, 'setPrefix')) {
            if (! app()->environment('testing')) {
                throw new \RuntimeException('The configured cache store cannot be safely tenant-prefixed. Use the database cache store.');
            }

            return;
        }
        $this->originalPrefix ??= (string) $store->getPrefix();
        $store->setPrefix($this->originalPrefix.'tenant_'.$tenant->getTenantKey().'_');
    }

    public function revert(): void
    {
        $store = $this->cache->store()->getStore();
        if ($this->originalPrefix !== null && method_exists($store, 'setPrefix')) {
            $store->setPrefix($this->originalPrefix);
        }
        $this->originalPrefix = null;
    }
}
