<?php

declare(strict_types=1);

namespace App\Providers;

use App\Http\Middleware\BindSessionToTenant;
use App\Http\Middleware\EnsureInstalled;
use App\Http\Middleware\EnsureTenantDomainIsVerified;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Stancl\Tenancy\Events;
use Stancl\Tenancy\Listeners;
use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;

class TenancyServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Event::listen(Events\TenancyInitialized::class, Listeners\BootstrapTenancy::class);
        Event::listen(Events\TenancyEnded::class, Listeners\RevertToCentralContext::class);

        $this->app->booted(function (): void {
            if ($this->app->environment('testing')) {
                // The legacy ERP suite predates host-based tenancy and exercises
                // tenant routes against localhost. Production never enters this branch.
                Route::domain('localhost')->middleware('web')->group(base_path('routes/tenant.php'));
                Route::domain('localhost')->prefix('api')->middleware('api')->group(base_path('routes/api.php'));

                return;
            }
            $tenantMiddleware = [
                EnsureInstalled::class,
                InitializeTenancyByDomain::class,
                PreventAccessFromCentralDomains::class,
                EnsureTenantDomainIsVerified::class,
                'tenant.initialized',
                'tenant.active',
            ];
            Route::middleware(array_merge($tenantMiddleware, ['web', BindSessionToTenant::class]))->group(base_path('routes/tenant.php'));
            Route::prefix('api')->middleware(array_merge($tenantMiddleware, ['api']))->group(base_path('routes/api.php'));
        });

        $this->app[Kernel::class]->prependToMiddlewarePriority(InitializeTenancyByDomain::class);
        // When both middleware are present, installation validation must run
        // before tenant lookup, sessions, or any domains-table query.
        $this->app[Kernel::class]->prependToMiddlewarePriority(EnsureInstalled::class);
    }
}
