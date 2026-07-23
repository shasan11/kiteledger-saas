<?php

use App\Http\Controllers\Central\AuthController;
use App\Http\Controllers\Central\BillingWebhookController;
use App\Http\Controllers\Central\CentralAdminController;
use App\Http\Controllers\Central\DashboardController as CentralDashboardController;
use App\Http\Controllers\Central\PlanController;
use App\Http\Controllers\Central\ResourceController;
use App\Http\Controllers\Central\TenantController;
use App\Http\Controllers\Central\WebsiteController;
use App\Http\Controllers\Installer\EnvironmentController as InstallerEnvironmentController;
use App\Http\Controllers\Installer\InstallTypeController;
use App\Http\Controllers\Installer\RecoveryController;
use App\Http\Controllers\Installer\TenancyController as InstallerTenancyController;
use App\Http\Controllers\Installer\DatabaseController as InstallerDatabaseController;
use Froiden\LaravelInstaller\Controllers\DatabaseController as PackageDatabaseController;
use Froiden\LaravelInstaller\Controllers\EnvironmentController as PackageEnvironmentController;
use Froiden\LaravelInstaller\Controllers\FinalController as PackageFinalController;
use Froiden\LaravelInstaller\Controllers\PermissionsController as PackagePermissionsController;
use Froiden\LaravelInstaller\Controllers\RequirementsController as PackageRequirementsController;
use Froiden\LaravelInstaller\Controllers\WelcomeController as PackageWelcomeController;
use Illuminate\Support\Facades\Route;

// Keep setup routes host-agnostic. Before installation the customer may be
// visiting by an IP address or a domain that has not been written to .env yet.
Route::get('install/recover', [RecoveryController::class, 'show'])->name('kiteledger.install.recover');
Route::post('install/recover', [RecoveryController::class, 'reset'])->name('kiteledger.install.recover.reset');

Route::middleware('install')->prefix('install')->name('kiteledger.install.')->group(function (): void {
    Route::post('environment/save', InstallerEnvironmentController::class)->name('environment.save');
    Route::get('type', [InstallTypeController::class, 'show'])->name('type');
    Route::post('type', [InstallTypeController::class, 'store'])->name('type.store');
    Route::prefix('tenancy')->name('tenancy.')->group(function (): void {
        Route::get('status', [InstallerTenancyController::class, 'status'])->name('status');
        Route::post('license', [InstallerTenancyController::class, 'license'])->name('license');
        Route::post('tenant-provisioning', [InstallerTenancyController::class, 'tenantProvisioning'])->name('tenant-provisioning');
    });
});

// Register package screens explicitly instead of loading its legacy GET save
// route. Installer credentials are accepted by the POST route above only.
Route::middleware('install')->prefix('install')->name('LaravelInstaller::')->group(function (): void {
    Route::get('/', [PackageWelcomeController::class, 'welcome'])->name('welcome');
    Route::get('environment', [PackageEnvironmentController::class, 'environment'])->name('environment');
    Route::get('requirements', [PackageRequirementsController::class, 'requirements'])->name('requirements');
    Route::get('permissions', [PackagePermissionsController::class, 'permissions'])->name('permissions');
    Route::get('database', [InstallerDatabaseController::class, 'database'])->name('database');
});

// Finalization writes the install lock before redirecting here, so this one
// presentation route must remain outside Froiden's canInstall middleware.
Route::get('install/final', [PackageFinalController::class, 'finish'])->name('LaravelInstaller::final');

$centralRoutes = function (string $namePrefix = 'central.', ?string $adminPath = null, bool $includeWebsite = true): void {
    if ($includeWebsite) {
        Route::get('/', [WebsiteController::class, 'home'])->name($namePrefix.'home');
        Route::get('/pricing', [WebsiteController::class, 'pricing'])->name($namePrefix.'pricing');
        Route::get('/p/{slug}', [WebsiteController::class, 'page'])->name($namePrefix.'page');
        Route::post('/billing/webhooks/{gateway}', BillingWebhookController::class)->middleware('throttle:120,1')->name($namePrefix.'billing.webhook');
    }

    Route::prefix($adminPath ?? config('saas.admin_path', 'superadmin'))->name($namePrefix)->group(function (): void {
        Route::get('/login', [AuthController::class, 'create'])->name('login');
        Route::post('/login', [AuthController::class, 'store'])->middleware('throttle:5,1')->name('login.store');
        Route::get('/mfa/challenge', [AuthController::class, 'mfaChallenge'])->name('mfa.challenge');
        Route::post('/mfa/challenge', [AuthController::class, 'mfaVerify'])->middleware('throttle:5,1')->name('mfa.verify');

        Route::middleware('central.admin')->group(function (): void {
            Route::post('/logout', [AuthController::class, 'destroy'])->name('logout');
            Route::post('/mfa/setup', [AuthController::class, 'mfaSetup'])->name('mfa.setup');
            Route::post('/mfa/enable', [AuthController::class, 'mfaEnable'])->name('mfa.enable');
            Route::get('/', CentralDashboardController::class)->name('dashboard');
            Route::resource('tenants', TenantController::class)->except(['destroy']);
            Route::post('tenants/{tenant}/suspend', [TenantController::class, 'suspend'])->name('tenants.suspend');
            Route::post('tenants/{tenant}/reactivate', [TenantController::class, 'reactivate'])->name('tenants.reactivate');
            Route::post('tenants/{tenant}/retry', [TenantController::class, 'retry'])->name('tenants.retry');
            Route::post('tenants/{tenant}/migrate', [TenantController::class, 'migrate'])->middleware('central.admin:tenant.manage')->name('tenants.migrate');
            Route::post('tenants/{tenant}/seed', [TenantController::class, 'seed'])->middleware('central.admin:tenant.manage')->name('tenants.seed');
            Route::get('tenants/{tenant}/health', [TenantController::class, 'health'])->name('tenants.health');
            Route::post('tenants/{tenant}/backup', [TenantController::class, 'backup'])->middleware('central.admin:tenant.backup')->name('tenants.backup');
            Route::post('tenants/{tenant}/deletion', [TenantController::class, 'requestDeletion'])->middleware('central.admin:tenant.delete')->name('tenants.deletion.request');
            Route::post('tenant-deletions/{deletion}/approve', [TenantController::class, 'approveDeletion'])->middleware('central.admin:tenant.delete')->name('tenants.deletion.approve');
            Route::post('tenants/{tenant}/impersonate', [TenantController::class, 'impersonate'])->middleware('central.admin:impersonate')->name('tenants.impersonate');
            Route::resource('plans', PlanController::class)->except(['show', 'destroy']);
            Route::middleware('central.admin:settings.manage')->group(function (): void {
                Route::get('central-admins', [CentralAdminController::class, 'index'])->name('central-admins.index');
                Route::post('central-admins', [CentralAdminController::class, 'store'])->name('central-admins.store');
                Route::patch('central-admins/{centralAdmin}', [CentralAdminController::class, 'update'])->name('central-admins.update');
                Route::delete('central-admins/{centralAdmin}', [CentralAdminController::class, 'destroy'])->name('central-admins.destroy');
            });

            foreach (['subscriptions', 'invoices', 'payments', 'gateways', 'website-pages', 'website-sections', 'website-menus', 'website-faqs', 'website-testimonials', 'blog-posts', 'default-templates', 'platform-settings', 'provisioning-logs', 'tenant-databases', 'usage', 'features', 'tenant-feature-overrides'] as $resource) {
                $permission = match (true) {
                    in_array($resource, ['subscriptions', 'invoices', 'payments'], true) => 'billing.manage',
                    $resource === 'gateways' => 'gateway.manage',
                    str_starts_with($resource, 'website-') || $resource === 'blog-posts' => 'cms.manage',
                    in_array($resource, ['platform-settings', 'default-templates', 'tenant-databases'], true) => 'settings.manage',
                    in_array($resource, ['features', 'tenant-feature-overrides'], true) => 'plan.manage',
                    default => 'tenant.view',
                };
                Route::get($resource, [ResourceController::class, 'index'])->defaults('resource', $resource)->name($resource.'.index');
                Route::post($resource, [ResourceController::class, 'store'])->middleware('central.admin:'.$permission)->defaults('resource', $resource)->name($resource.'.store');
                Route::patch($resource.'/{id}', [ResourceController::class, 'update'])->middleware('central.admin:'.$permission)->defaults('resource', $resource)->name($resource.'.update');
                Route::delete($resource.'/{id}', [ResourceController::class, 'destroy'])->middleware('central.admin:'.$permission)->defaults('resource', $resource)->name($resource.'.destroy');
            }
            Route::post('subscriptions/{subscription}/action', [ResourceController::class, 'subscriptionAction'])->middleware('central.admin:billing.manage')->name('subscriptions.action');
            Route::post('invoices/{invoice}/manual-payment', [ResourceController::class, 'approveManualPayment'])->middleware('central.admin:billing.manage')->name('invoices.manual-payment');
            Route::get('invoices/{invoice}/pdf', [ResourceController::class, 'invoicePdf'])->middleware('central.admin:billing.manage')->name('invoices.pdf');
            Route::post('payments/{payment}/refund', [ResourceController::class, 'refund'])->middleware('central.admin:billing.manage')->name('payments.refund');
            Route::post('tenant-databases/{id}/revalidate', [ResourceController::class, 'revalidateTenantDatabase'])->middleware('central.admin:settings.manage')->name('tenant-databases.revalidate');
        });
    });
};

// Domain constraints keep identical tenant and central paths (/, /login, etc.)
// from shadowing one another. Reverse registration keeps the first configured
// domain as the URL-generation default while every configured host still works.
$centralDomains = array_values(array_unique(config('tenancy.central_domains', [])));
$defaultCentralDomain = $centralDomains[0] ?? null;

foreach (array_reverse($centralDomains, true) as $index => $centralDomain) {
    $namePrefix = $centralDomain === $defaultCentralDomain ? 'central.' : 'central.hosts.'.($index + 1).'.';

    Route::domain($centralDomain)->middleware('central.domain')->group(function () use ($centralRoutes, $namePrefix, $index): void {
        $centralRoutes($namePrefix);
        if (config('saas.admin_path', 'superadmin') !== 'admin') {
            $centralRoutes('central.legacy.'.($index + 1).'.', 'admin', false);
        }
    });
}
