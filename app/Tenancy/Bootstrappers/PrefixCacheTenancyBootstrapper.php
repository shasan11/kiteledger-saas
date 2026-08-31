<?php

declare(strict_types=1);

namespace App\Tenancy\Bootstrappers;

use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\Facades\Cache;
use Stancl\Tenancy\Contracts\TenancyBootstrapper;
use Stancl\Tenancy\Contracts\Tenant;

/**
 * Isolates tenant cache entries by prefixing the cache key namespace instead of
 * tagging them.
 *
 * Replaces Stancl\Tenancy\Bootstrappers\CacheTenancyBootstrapper, which routes
 * every cache call through tags() and therefore hard-fails with "This cache
 * store does not support tagging." on the file, database and dynamodb drivers.
 * Prefixing works on every driver, so a self-hosted install does not need redis
 * or memcached.
 */
class PrefixCacheTenancyBootstrapper implements TenancyBootstrapper
{
    protected ?string $originalPrefix = null;

    /** @var array<string, string|null> */
    protected array $originalFilePaths = [];

    public function __construct(protected Application $app) {}

    public function bootstrap(Tenant $tenant): void
    {
        $this->originalPrefix = $this->originalPrefix ?? (string) config('cache.prefix');

        if ($this->originalFilePaths === []) {
            $this->originalFilePaths = $this->currentFilePaths();
        }

        $suffix = (string) config('tenancy.cache.prefix_base', 'tenant_') . $tenant->getTenantKey();

        $this->apply($this->originalPrefix . $suffix . '_', $suffix);
    }

    public function revert(): void
    {
        if ($this->originalPrefix === null) {
            return;
        }

        $this->apply($this->originalPrefix, null);

        $this->originalPrefix = null;
    }

    /**
     * Apply the prefix and drop every memoized store so the next resolve picks
     * it up. The facade keeps its own resolved instance, hence the extra reset.
     *
     * @param string|null $directorySuffix Appended to each file store's path, or
     *                                     null to restore the original paths.
     */
    protected function apply(string $prefix, ?string $directorySuffix): void
    {
        config(['cache.prefix' => $prefix]);

        foreach (array_keys(config('cache.stores', [])) as $store) {
            config(["cache.stores.{$store}.prefix" => $prefix]);
        }

        // FileStore::getPrefix() always returns '', so the file driver is scoped
        // by giving each tenant its own cache directory instead.
        foreach ($this->originalFilePaths as $store => $path) {
            if ($path === null) {
                continue;
            }

            config([
                "cache.stores.{$store}.path" => $directorySuffix === null
                    ? $path
                    : rtrim($path, '/\\') . DIRECTORY_SEPARATOR . $directorySuffix,
            ]);
        }

        $this->app->forgetInstance('cache');
        $this->app->forgetInstance('cache.store');
        $this->app->forgetInstance('memcached.connector');

        Cache::clearResolvedInstances();
    }

    /**
     * @return array<string, string|null>
     */
    protected function currentFilePaths(): array
    {
        $paths = [];

        foreach (config('cache.stores', []) as $store => $config) {
            if (($config['driver'] ?? null) === 'file' && isset($config['path'])) {
                $paths[$store] = (string) $config['path'];
            }
        }

        return $paths;
    }
}
