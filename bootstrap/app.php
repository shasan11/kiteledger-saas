<?php

use App\Http\Middleware\BindSessionToTenant;
use App\Http\Middleware\DisableRemoteViteHotFile;
use App\Http\Middleware\EnforceTenantModuleAccess;
use App\Http\Middleware\EnforceTenantQuotas;
use App\Http\Middleware\EnsureCentralAdmin;
use App\Http\Middleware\EnsureCentralDomain;
use App\Http\Middleware\EnsureFeatureIsAllowed;
use App\Http\Middleware\EnsureInstalled;
use App\Http\Middleware\EnsurePlanLimitNotExceeded;
use App\Http\Middleware\EnsureSubscriptionIsValid;
use App\Http\Middleware\EnsureTenantIsActive;
use App\Http\Middleware\EnsureTenancyIsInitialized;
use App\Http\Middleware\RequireTenantFeature;
use App\Http\Middleware\EnforceTenantLimit;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetLocale;
use Froiden\LaravelInstaller\Middleware\canInstall;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $trustedProxies = array_values(array_filter(array_map('trim', explode(',', (string) env('TRUSTED_PROXY_IPS', '')))));
        if ($trustedProxies) {
            $middleware->trustProxies(
                at: $trustedProxies,
                headers: Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_PORT | Request::HEADER_X_FORWARDED_PROTO,
            );
        }
        // Prepended so an un-installed deployment is redirected to /install
        // before session/cookie middleware (which need APP_KEY) ever run.
        $middleware->web(prepend: [
            EnsureInstalled::class,
            DisableRemoteViteHotFile::class,
        ]);

        $middleware->web(append: [
            SetLocale::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'central.domain' => EnsureCentralDomain::class,
            'central.admin' => EnsureCentralAdmin::class,
            'tenant.active' => EnsureTenantIsActive::class,
            'tenant.initialized' => EnsureTenancyIsInitialized::class,
            'tenant.feature' => RequireTenantFeature::class,
            'tenant.limit' => EnforceTenantLimit::class,
            'subscription.valid' => EnsureSubscriptionIsValid::class,
            'feature.allowed' => EnsureFeatureIsAllowed::class,
            'plan.within-limit' => EnsurePlanLimitNotExceeded::class,
            'quota.enforce' => EnforceTenantQuotas::class,
            'feature.enforce' => EnforceTenantModuleAccess::class,
            'tenant.session' => BindSessionToTenant::class,
            'install' => canInstall::class,
        ]);

        // The installer posts before APP_KEY/session exist.
        $middleware->validateCsrfTokens(except: [
            'install',
            'install/*',
            'billing/webhooks/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (InvalidArgumentException $exception, Request $request) {
            if ($request->is('api/pos*') || $request->is('api/pos-*')) {
                return response()->json([
                    'message' => $exception->getMessage(),
                ], 422);
            }

            return null;
        });
    })->create();
