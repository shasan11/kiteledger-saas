<?php

use App\Http\Controllers\Central\AuthController;
use App\Http\Controllers\Central\BillingWebhookController;
use App\Http\Controllers\Central\DashboardController as CentralDashboardController;
use App\Http\Controllers\Central\PlanController;
use App\Http\Controllers\Central\ResourceController;
use App\Http\Controllers\Central\TenantController;
use App\Http\Controllers\Central\WebsiteController;
use App\Http\Controllers\Installer\EnvironmentController as InstallerEnvironmentController;
use App\Http\Controllers\Installer\InstallTypeController;
use App\Http\Controllers\Installer\RecoveryController;
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
});

// Register package screens explicitly instead of loading its legacy GET save
// route. Installer credentials are accepted by the POST route above only.
Route::middleware('install')->prefix('install')->name('LaravelInstaller::')->group(function (): void {
    Route::get('/', [PackageWelcomeController::class, 'welcome'])->name('welcome');
    Route::get('environment', [PackageEnvironmentController::class, 'environment'])->name('environment');
    Route::get('requirements', [PackageRequirementsController::class, 'requirements'])->name('requirements');
    Route::get('permissions', [PackagePermissionsController::class, 'permissions'])->name('permissions');
    Route::get('database', [PackageDatabaseController::class, 'database'])->name('database');
    Route::get('final', [PackageFinalController::class, 'finish'])->name('final');
});

$centralRoutes = function (): void {
    Route::get('/', [WebsiteController::class, 'home'])->name('central.home');
    Route::get('/pricing', [WebsiteController::class, 'pricing'])->name('central.pricing');
    Route::get('/p/{slug}', [WebsiteController::class, 'page'])->name('central.page');
    Route::post('/billing/webhooks/{gateway}', BillingWebhookController::class)->middleware('throttle:120,1')->name('central.billing.webhook');

    Route::prefix(config('saas.admin_path', 'admin'))->name('central.')->group(function (): void {
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
            Route::post('tenants/{tenant}/backup', [TenantController::class, 'backup'])->middleware('central.admin:tenant.backup')->name('tenants.backup');
            Route::post('tenants/{tenant}/deletion', [TenantController::class, 'requestDeletion'])->middleware('central.admin:tenant.delete')->name('tenants.deletion.request');
            Route::post('tenant-deletions/{deletion}/approve', [TenantController::class, 'approveDeletion'])->middleware('central.admin:tenant.delete')->name('tenants.deletion.approve');
            Route::post('tenants/{tenant}/impersonate', [TenantController::class, 'impersonate'])->middleware('central.admin:impersonate')->name('tenants.impersonate');
            Route::resource('plans', PlanController::class)->except(['show', 'destroy']);

            foreach (['subscriptions', 'invoices', 'payments', 'gateways', 'website-pages', 'website-sections', 'website-menus', 'website-faqs', 'website-testimonials', 'blog-posts', 'default-templates', 'platform-settings', 'provisioning-logs', 'tenant-databases', 'usage'] as $resource) {
                $permission = match (true) {
                    in_array($resource, ['subscriptions', 'invoices', 'payments'], true) => 'billing.manage',
                    $resource === 'gateways' => 'gateway.manage',
                    str_starts_with($resource, 'website-') || $resource === 'blog-posts' => 'cms.manage',
                    in_array($resource, ['platform-settings', 'default-templates', 'tenant-databases'], true) => 'settings.manage',
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
foreach (array_reverse(config('tenancy.central_domains', [])) as $centralDomain) {
    Route::domain($centralDomain)->middleware('central.domain')->group($centralRoutes);
}
