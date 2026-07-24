<?php

use App\Http\Controllers\Central\AuthController;
use App\Http\Controllers\Central\BackupController;
use App\Http\Controllers\Central\BillingController;
use App\Http\Controllers\Central\BillingWebhookController;
use App\Http\Controllers\Central\BlogController;
use App\Http\Controllers\Central\BlogTaxonomyController;
use App\Http\Controllers\Central\CentralAdminController;
use App\Http\Controllers\Central\DashboardController as CentralDashboardController;
use App\Http\Controllers\Central\FeatureController;
use App\Http\Controllers\Central\FeatureOverrideController;
use App\Http\Controllers\Central\GlobalSearchController;
use App\Http\Controllers\Central\InvoiceCustomizationController;
use App\Http\Controllers\Central\MediaController;
use App\Http\Controllers\Central\NotificationController;
use App\Http\Controllers\Central\PlanController;
use App\Http\Controllers\Central\ResourceController;
use App\Http\Controllers\Central\RoleController;
use App\Http\Controllers\Central\SettingsController;
use App\Http\Controllers\Central\SupportController;
use App\Http\Controllers\Central\TenantController;
use App\Http\Controllers\Central\WebsiteAdminController;
use App\Http\Controllers\Central\WebsiteContentController;
use App\Http\Controllers\Central\WebsiteController;
use App\Http\Controllers\Installer\DatabaseController as InstallerDatabaseController;
use App\Http\Controllers\Installer\EnvironmentController as InstallerEnvironmentController;
use App\Http\Controllers\Installer\InstallTypeController;
use App\Http\Controllers\Installer\PermissionsController as InstallerPermissionsController;
use App\Http\Controllers\Installer\RecoveryController;
use App\Http\Controllers\Installer\TenancyController as InstallerTenancyController;
use Froiden\LaravelInstaller\Controllers\EnvironmentController as PackageEnvironmentController;
use Froiden\LaravelInstaller\Controllers\FinalController as PackageFinalController;
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
    });
});

// Register package screens explicitly instead of loading its legacy GET save
// route. Installer credentials are accepted by the POST route above only.
Route::middleware('install')->prefix('install')->name('LaravelInstaller::')->group(function (): void {
    Route::get('/', [PackageWelcomeController::class, 'welcome'])->name('welcome');
    Route::get('environment', [PackageEnvironmentController::class, 'environment'])->name('environment');
    Route::get('requirements', [PackageRequirementsController::class, 'requirements'])->name('requirements');
    Route::get('permissions', [InstallerPermissionsController::class, 'permissions'])->name('permissions');
    Route::get('database', [InstallerDatabaseController::class, 'database'])->name('database');
});

// Finalization writes the install lock before redirecting here, so this one
// presentation route must remain outside Froiden's canInstall middleware.
Route::get('install/final', [PackageFinalController::class, 'finish'])->name('LaravelInstaller::final');

$centralRoutes = function (string $namePrefix = 'central.', ?string $adminPath = null, bool $includeWebsite = true): void {
    if ($includeWebsite) {
        Route::get('/', [WebsiteController::class, 'home'])->name($namePrefix.'home');
        Route::get('/pricing', [WebsiteController::class, 'pricing'])->name($namePrefix.'pricing');
        Route::get('/blog', [WebsiteController::class, 'blog'])->name($namePrefix.'blog');
        Route::get('/blog/category/{category}', [WebsiteController::class, 'category'])->name($namePrefix.'blog.category');
        Route::get('/blog/tag/{tag}', [WebsiteController::class, 'tag'])->name($namePrefix.'blog.tag');
        Route::get('/blog/{slug}', [WebsiteController::class, 'post'])->name($namePrefix.'blog.post');
        Route::get('/sitemap.xml', [WebsiteController::class, 'sitemap'])->name($namePrefix.'sitemap');
        Route::get('/robots.txt', [WebsiteController::class, 'robots'])->name($namePrefix.'robots');
        Route::get('/p/{slug}', [WebsiteController::class, 'page'])->name($namePrefix.'page');
        Route::get('/{slug}', [WebsiteController::class, 'page'])->whereIn('slug', ['features', 'about', 'contact', 'support', 'privacy-policy', 'terms-of-service', 'cookie-policy'])->name($namePrefix.'content.page');
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
            Route::get('search', GlobalSearchController::class)->name('search');
            Route::get('tenants', [TenantController::class, 'index'])->middleware('central.admin:tenant.view')->name('tenants.index');
            Route::get('tenants/create', [TenantController::class, 'create'])->middleware('central.admin:tenant.create')->name('tenants.create');
            Route::post('tenants', [TenantController::class, 'store'])->middleware('central.admin:tenant.create')->name('tenants.store');
            Route::get('tenants/{tenant}', [TenantController::class, 'show'])->middleware('central.admin:tenant.view')->name('tenants.show');
            Route::get('tenants/{tenant}/edit', [TenantController::class, 'edit'])->middleware('central.admin:tenant.update')->name('tenants.edit');
            Route::match(['put', 'patch'], 'tenants/{tenant}', [TenantController::class, 'update'])->middleware('central.admin:tenant.update')->name('tenants.update');
            Route::post('tenants/{tenant}/suspend', [TenantController::class, 'suspend'])->middleware('central.admin:tenant.suspend')->name('tenants.suspend');
            Route::post('tenants/{tenant}/reactivate', [TenantController::class, 'reactivate'])->middleware('central.admin:tenant.reactivate')->name('tenants.reactivate');
            Route::post('tenants/{tenant}/retry', [TenantController::class, 'retry'])->middleware('central.admin:tenant.update')->name('tenants.retry');
            Route::post('tenants/{tenant}/migrate', [TenantController::class, 'migrate'])->middleware('central.admin:tenant.update')->name('tenants.migrate');
            Route::post('tenants/{tenant}/seed', [TenantController::class, 'seed'])->middleware('central.admin:tenant.update')->name('tenants.seed');
            Route::get('tenants/{tenant}/health', [TenantController::class, 'health'])->middleware('central.admin:system_health.view')->name('tenants.health');
            Route::post('tenants/{tenant}/backup', [TenantController::class, 'backup'])->middleware('central.admin:tenant.backup')->name('tenants.backup');
            Route::post('tenants/{tenant}/deletion', [TenantController::class, 'requestDeletion'])->middleware('central.admin:tenant.delete')->name('tenants.deletion.request');
            Route::post('tenant-deletions/{deletion}/approve', [TenantController::class, 'approveDeletion'])->middleware('central.admin:tenant.delete')->name('tenants.deletion.approve');
            Route::post('tenants/{tenant}/impersonate', [TenantController::class, 'impersonate'])->middleware('central.admin:tenant.impersonate')->name('tenants.impersonate');
            Route::get('plans', [PlanController::class, 'index'])->middleware('central.admin:plan.view')->name('plans.index');
            Route::get('plans/create', [PlanController::class, 'create'])->middleware('central.admin:plan.manage')->name('plans.create');
            Route::post('plans', [PlanController::class, 'store'])->middleware('central.admin:plan.manage')->name('plans.store');
            Route::get('plans/{plan}/edit', [PlanController::class, 'edit'])->middleware('central.admin:plan.manage')->name('plans.edit');
            Route::match(['put', 'patch'], 'plans/{plan}', [PlanController::class, 'update'])->middleware('central.admin:plan.manage')->name('plans.update');
            Route::get('features', [FeatureController::class, 'index'])->middleware('central.admin:feature.view')->name('features.index');
            Route::post('features', [FeatureController::class, 'store'])->middleware('central.admin:feature.manage')->name('features.store');
            Route::patch('features/{feature}', [FeatureController::class, 'update'])->middleware('central.admin:feature.manage')->name('features.update');
            Route::delete('features/{feature}', [FeatureController::class, 'destroy'])->middleware('central.admin:feature.manage')->name('features.destroy');
            Route::get('tenant-feature-overrides', [FeatureOverrideController::class, 'index'])->middleware('central.admin:feature_override.manage')->name('tenant-feature-overrides.index');
            Route::put('tenant-feature-overrides/{tenant}/{feature}', [FeatureOverrideController::class, 'update'])->middleware('central.admin:feature_override.manage')->name('tenant-feature-overrides.update');
            Route::delete('tenant-feature-overrides/{tenant}/{feature}', [FeatureOverrideController::class, 'destroy'])->middleware('central.admin:feature_override.manage')->name('tenant-feature-overrides.destroy');
            Route::get('tenant-feature-overrides/{tenant}/{feature}/history', [FeatureOverrideController::class, 'history'])->middleware('central.admin:feature_override.manage')->name('tenant-feature-overrides.history');
            Route::middleware('central.admin:admin.manage')->group(function (): void {
                Route::get('central-admins', [CentralAdminController::class, 'index'])->name('central-admins.index');
                Route::post('central-admins', [CentralAdminController::class, 'store'])->name('central-admins.store');
                Route::patch('central-admins/{centralAdmin}', [CentralAdminController::class, 'update'])->name('central-admins.update');
                Route::delete('central-admins/{centralAdmin}', [CentralAdminController::class, 'destroy'])->name('central-admins.destroy');
            });
            Route::middleware('central.admin:role.manage')->group(function (): void {
                Route::get('roles', [RoleController::class, 'index'])->name('roles.index');
                Route::put('roles/{role}', [RoleController::class, 'update'])->name('roles.update');
            });

            Route::get('subscriptions', [BillingController::class, 'subscriptions'])->middleware('central.admin:subscription.view')->name('subscriptions.index');
            Route::get('invoices', [BillingController::class, 'invoices'])->middleware('central.admin:invoice.view')->name('invoices.index');
            Route::post('invoices/{invoice}/send', [BillingController::class, 'sendInvoice'])->middleware('central.admin:invoice.manage')->name('invoices.send');
            Route::get('payments', [BillingController::class, 'payments'])->middleware('central.admin:payment.view')->name('payments.index');
            Route::get('payments/{payment}/proof', [BillingController::class, 'paymentProof'])->middleware('central.admin:payment.view')->name('payments.proof');
            Route::get('payments/manual', [BillingController::class, 'createPayment'])->middleware('central.admin:payment.add_manual')->name('payments.manual.create');
            Route::post('payments/manual', [BillingController::class, 'storePayment'])->middleware('central.admin:payment.add_manual')->name('payments.manual.store');
            Route::get('gateways', [BillingController::class, 'gateways'])->middleware('central.admin:gateway.view')->name('gateways.index');
            Route::put('gateways/{gateway}', [BillingController::class, 'updateGateway'])->middleware('central.admin:gateway.manage')->name('gateways.update');
            Route::post('gateways/{gateway}/test', [BillingController::class, 'testGateway'])->middleware('central.admin:gateway.manage')->name('gateways.test');

            Route::get('backups', [BackupController::class, 'index'])->middleware('central.admin:system_health.view')->name('backups.index');
            Route::post('backups', [BackupController::class, 'store'])->middleware('central.admin:tenant.backup')->name('backups.store');
            Route::post('backups/{backup}/verify', [BackupController::class, 'verify'])->middleware('central.admin:tenant.backup')->name('backups.verify');
            Route::get('backups/{backup}/download', [BackupController::class, 'download'])->middleware('central.admin:system_health.view')->name('backups.download');
            Route::delete('backups/{backup}', [BackupController::class, 'destroy'])->middleware('central.admin:tenant.backup')->name('backups.destroy');

            Route::get('settings', [SettingsController::class, 'index'])->middleware('central.admin:settings.view')->name('settings.index');
            Route::put('settings/{group}', [SettingsController::class, 'update'])->middleware('central.admin:settings.manage')->name('settings.update');
            Route::post('settings/{group}/reset', [SettingsController::class, 'reset'])->middleware('central.admin:settings.manage')->name('settings.reset');
            Route::post('settings/{group}/test', [SettingsController::class, 'test'])->middleware('central.admin:settings.manage')->name('settings.test');
            Route::get('settings/history/{setting}', [SettingsController::class, 'history'])->middleware('central.admin:settings.view')->name('settings.history');
            Route::middleware('central.admin:invoice.customize')->group(function (): void {
                Route::get('invoice-customization', [InvoiceCustomizationController::class, 'index'])->name('invoice-customization.index');
                Route::put('invoice-customization', [InvoiceCustomizationController::class, 'update'])->name('invoice-customization.update');
                Route::get('invoice-customization/test-pdf', [InvoiceCustomizationController::class, 'testPdf'])->name('invoice-customization.test-pdf');
                Route::get('invoice-customization/email-preview', [InvoiceCustomizationController::class, 'emailPreview'])->name('invoice-customization.email-preview');
            });
            Route::get('seo-settings', [SettingsController::class, 'index'])->defaults('group', 'seo')->middleware('central.admin:seo.manage')->name('seo.index');

            Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
            Route::post('notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');
            Route::post('notifications/bulk', [NotificationController::class, 'bulk'])->name('notifications.bulk');
            Route::post('notifications/{notification}/read', [NotificationController::class, 'read'])->name('notifications.read');
            Route::delete('notifications/{notification}', [NotificationController::class, 'dismiss'])->name('notifications.dismiss');

            Route::get('support/tickets', [SupportController::class, 'index'])->middleware('central.admin:ticket.view')->name('support.tickets.index');
            Route::get('support/tickets/{ticket}', [SupportController::class, 'show'])->middleware('central.admin:ticket.view')->name('support.tickets.show');
            Route::patch('support/tickets/{ticket}', [SupportController::class, 'update'])->middleware('central.admin:ticket.update')->name('support.tickets.update');
            Route::post('support/tickets/{ticket}/reply', [SupportController::class, 'reply'])->middleware('central.admin:ticket.reply')->name('support.tickets.reply');
            Route::delete('support/tickets/{ticket}', [SupportController::class, 'destroy'])->middleware('central.admin:ticket.delete')->name('support.tickets.destroy');
            Route::get('support/attachments/{attachment}', [SupportController::class, 'download'])->middleware('central.admin:ticket.view')->name('support.attachments.download');

            Route::get('website', WebsiteAdminController::class)->middleware('central.admin:cms.view')->name('website.overview');
            Route::middleware('central.admin:cms.view')->group(function (): void {
                Route::get('website-pages', [WebsiteContentController::class, 'pages'])->name('website-pages.index');
                Route::get('website-pages/create', [WebsiteContentController::class, 'createPage'])->middleware('central.admin:cms.manage')->name('website-pages.create');
                Route::get('website-pages/{page}/edit', [WebsiteContentController::class, 'editPage'])->middleware('central.admin:cms.manage')->name('website-pages.edit');
                Route::get('website-pages/{page}/preview', [WebsiteContentController::class, 'previewPage'])->name('website-pages.preview');
                Route::post('website-pages', [WebsiteContentController::class, 'storePage'])->middleware('central.admin:cms.manage')->name('website-pages.store');
                Route::put('website-pages/{page}', [WebsiteContentController::class, 'updatePage'])->middleware('central.admin:cms.manage')->name('website-pages.update');
                Route::delete('website-pages/{page}', [WebsiteContentController::class, 'destroyPage'])->middleware('central.admin:cms.manage')->name('website-pages.destroy');
                Route::post('website-pages/{page}/revisions/{revision}', [WebsiteContentController::class, 'restorePageRevision'])->middleware('central.admin:cms.manage')->name('website-pages.revisions.restore');

                Route::get('website-sections', [WebsiteContentController::class, 'sections'])->name('website-sections.index');
                Route::post('website-sections', [WebsiteContentController::class, 'storeSection'])->middleware('central.admin:cms.manage')->name('website-sections.store');
                Route::put('website-sections/reorder', [WebsiteContentController::class, 'reorderSections'])->middleware('central.admin:cms.manage')->name('website-sections.reorder');
                Route::put('website-sections/{section}', [WebsiteContentController::class, 'updateSection'])->middleware('central.admin:cms.manage')->name('website-sections.update');
                Route::delete('website-sections/{section}', [WebsiteContentController::class, 'destroySection'])->middleware('central.admin:cms.manage')->name('website-sections.destroy');

                Route::get('website-menus', [WebsiteContentController::class, 'menus'])->name('website-menus.index');
                Route::post('website-menus', [WebsiteContentController::class, 'storeMenu'])->middleware('central.admin:cms.manage')->name('website-menus.store');
                Route::put('website-menus/reorder', [WebsiteContentController::class, 'reorderMenus'])->middleware('central.admin:cms.manage')->name('website-menus.reorder');
                Route::put('website-menus/{menu}', [WebsiteContentController::class, 'updateMenu'])->middleware('central.admin:cms.manage')->name('website-menus.update');
                Route::delete('website-menus/{menu}', [WebsiteContentController::class, 'destroyMenu'])->middleware('central.admin:cms.manage')->name('website-menus.destroy');
            });
            Route::get('blog-posts', [BlogController::class, 'index'])->middleware('central.admin:blog.view')->name('blog.index');
            Route::get('blog-posts/create', [BlogController::class, 'create'])->middleware('central.admin:blog.manage')->name('blog.create');
            Route::post('blog-posts', [BlogController::class, 'store'])->middleware('central.admin:blog.manage')->name('blog.store');
            Route::post('blog-posts/bulk', [BlogController::class, 'bulk'])->middleware('central.admin:blog.manage')->name('blog.bulk');
            Route::post('blog-posts/{post}/duplicate', [BlogController::class, 'duplicate'])->middleware('central.admin:blog.manage')->name('blog.duplicate');
            Route::patch('blog-posts/{post}/quick', [BlogController::class, 'quickUpdate'])->middleware('central.admin:blog.manage')->name('blog.quick-update');
            Route::get('blog-posts/{post}/preview', [BlogController::class, 'preview'])->middleware('central.admin:blog.view')->name('blog.preview');
            Route::post('blog-posts/{post}/revisions/{revision}', [BlogController::class, 'restoreRevision'])->middleware('central.admin:blog.manage')->name('blog.revisions.restore');
            Route::get('blog-posts/{post}/edit', [BlogController::class, 'edit'])->middleware('central.admin:blog.manage')->name('blog.edit');
            Route::put('blog-posts/{post}', [BlogController::class, 'update'])->middleware('central.admin:blog.manage')->name('blog.update');
            Route::delete('blog-posts/{post}', [BlogController::class, 'destroy'])->middleware('central.admin:blog.manage')->name('blog.destroy');
            foreach (['categories', 'tags'] as $taxonomy) {
                Route::get('blog-'.$taxonomy, [BlogTaxonomyController::class, 'index'])->defaults('type', $taxonomy)->middleware('central.admin:blog.view')->name('blog-'.$taxonomy.'.index');
                Route::post('blog-'.$taxonomy, [BlogTaxonomyController::class, 'store'])->defaults('type', $taxonomy)->middleware('central.admin:blog.manage')->name('blog-'.$taxonomy.'.store');
                Route::patch('blog-'.$taxonomy.'/{id}', [BlogTaxonomyController::class, 'update'])->defaults('type', $taxonomy)->middleware('central.admin:blog.manage')->name('blog-'.$taxonomy.'.update');
                Route::delete('blog-'.$taxonomy.'/{id}', [BlogTaxonomyController::class, 'destroy'])->defaults('type', $taxonomy)->middleware('central.admin:blog.manage')->name('blog-'.$taxonomy.'.destroy');
            }
            Route::resource('media', MediaController::class)->only(['index', 'store', 'update', 'destroy'])->middleware('central.admin:cms.manage');
            foreach (['faqs' => 'faq', 'testimonials' => 'testimonial'] as $path => $type) {
                Route::get('website-'.$path, [WebsiteContentController::class, 'contentItems'])->defaults('type', $type)->middleware('central.admin:cms.view')->name('website-'.$path.'.index');
                Route::post('website-'.$path, [WebsiteContentController::class, 'storeContentItem'])->defaults('type', $type)->middleware('central.admin:cms.manage')->name('website-'.$path.'.store');
                Route::patch('website-'.$path.'/{item}', [WebsiteContentController::class, 'updateContentItem'])->defaults('type', $type)->middleware('central.admin:cms.manage')->name('website-'.$path.'.update');
                Route::delete('website-'.$path.'/{item}', [WebsiteContentController::class, 'destroyContentItem'])->defaults('type', $type)->middleware('central.admin:cms.manage')->name('website-'.$path.'.destroy');
            }

            Route::get('support-categories', [SupportController::class, 'categories'])->middleware('central.admin:ticket.view')->name('support-categories.index');
            Route::post('support-categories', [SupportController::class, 'storeCategory'])->middleware('central.admin:support.manage')->name('support-categories.store');
            Route::patch('support-categories/{category}', [SupportController::class, 'updateCategory'])->middleware('central.admin:support.manage')->name('support-categories.update');
            Route::delete('support-categories/{category}', [SupportController::class, 'destroyCategory'])->middleware('central.admin:support.manage')->name('support-categories.destroy');
            Route::get('saved-replies', [SupportController::class, 'savedReplies'])->middleware('central.admin:ticket.view')->name('saved-replies.index');
            Route::post('saved-replies', [SupportController::class, 'storeSavedReply'])->middleware('central.admin:support.manage')->name('saved-replies.store');
            Route::patch('saved-replies/{reply}', [SupportController::class, 'updateSavedReply'])->middleware('central.admin:support.manage')->name('saved-replies.update');
            Route::delete('saved-replies/{reply}', [SupportController::class, 'destroySavedReply'])->middleware('central.admin:support.manage')->name('saved-replies.destroy');

            foreach (['default-templates', 'provisioning-logs', 'tenant-databases', 'usage', 'audit-logs'] as $resource) {
                $permission = match (true) {
                    in_array($resource, ['subscriptions', 'invoices', 'payments'], true) => 'billing.manage',
                    $resource === 'gateways' => 'gateway.manage',
                    str_starts_with($resource, 'website-') || $resource === 'blog-posts' => 'cms.manage',
                    in_array($resource, ['blog-categories', 'blog-tags'], true) => 'blog.manage',
                    in_array($resource, ['support-categories', 'saved-replies'], true) => 'support.manage',
                    $resource === 'roles' => 'role.manage',
                    $resource === 'audit-logs' => 'audit.view',
                    $resource === 'backups' => 'system_health.view',
                    in_array($resource, ['platform-settings', 'default-templates', 'tenant-databases'], true) => 'settings.manage',
                    $resource === 'features' => 'feature.manage',
                    $resource === 'tenant-feature-overrides' => 'feature_override.manage',
                    default => 'tenant.view',
                };
                $viewPermission = match (true) {
                    in_array($resource, ['features'], true) => 'feature.view', $resource === 'tenant-feature-overrides' => 'feature_override.manage',
                    in_array($resource, ['website-pages', 'website-sections', 'website-menus', 'website-faqs', 'website-testimonials'], true) => 'cms.view',
                    in_array($resource, ['blog-categories', 'blog-tags'], true) => 'blog.view', in_array($resource, ['support-categories', 'saved-replies'], true) => 'ticket.view',
                    $resource === 'audit-logs' => 'audit.view', in_array($resource, ['backups', 'provisioning-logs', 'tenant-databases'], true) => 'system_health.view',
                    default => 'settings.view',
                };
                Route::get($resource, [ResourceController::class, 'index'])->middleware('central.admin:'.$viewPermission)->defaults('resource', $resource)->name($resource.'.index');
                if (! in_array($resource, ['provisioning-logs', 'usage', 'backups', 'roles', 'audit-logs'], true)) {
                    Route::post($resource, [ResourceController::class, 'store'])->middleware('central.admin:'.$permission)->defaults('resource', $resource)->name($resource.'.store');
                    Route::patch($resource.'/{id}', [ResourceController::class, 'update'])->middleware('central.admin:'.$permission)->defaults('resource', $resource)->name($resource.'.update');
                    Route::delete($resource.'/{id}', [ResourceController::class, 'destroy'])->middleware('central.admin:'.$permission)->defaults('resource', $resource)->name($resource.'.destroy');
                }
            }
            Route::post('subscriptions/{subscription}/action', [ResourceController::class, 'subscriptionAction'])->middleware('central.admin:subscription.manage')->name('subscriptions.action');
            Route::get('invoices/{invoice}/pdf', [ResourceController::class, 'invoicePdf'])->middleware('central.admin:invoice.view')->name('invoices.pdf');
            Route::post('payments/{payment}/refund', [ResourceController::class, 'refund'])->middleware('central.admin:payment.refund')->name('payments.refund');
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
