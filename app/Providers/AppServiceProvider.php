<?php

namespace App\Providers;

use App\Contracts\SaaS\BackupManager;
use App\Contracts\SaaS\FeatureResolver;
use App\Contracts\SaaS\QuotaManager;
use App\Contracts\SaaS\SubscriptionLifecycle;
use App\Http\Controllers\Installer\DatabaseController;
use App\Http\Controllers\Installer\FinalController;
use App\Http\Controllers\Installer\PermissionsController;
use App\Models\BankAccount;
use App\Models\Branch;
use App\Models\CashTransfer;
use App\Models\CashTransferLine;
use App\Models\ChartOfAccount;
use App\Models\ChequeRegister;
use App\Models\Contact;
use App\Models\Currency;
use App\Models\CustomerPayment;
use App\Models\Deal;
use App\Models\DebitNote;
use App\Models\DocumentUpload;
use App\Models\Expense;
use App\Models\InventoryAdjustment;
use App\Models\Invoice;
use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use App\Models\Lead;
use App\Models\LoanAccount;
use App\Models\LoanCharge;
use App\Models\LoanTopUp;
use App\Models\PosCashMovement;
use App\Models\PosReturn;
use App\Models\PosSale;
use App\Models\PosShift;
use App\Models\Product;
use App\Models\ProductionJournal;
use App\Models\ProductionOrder;
use App\Models\ProformaInvoice;
use App\Models\PurchaseBill;
use App\Models\PurchaseOrder;
use App\Models\Quotation;
use App\Models\SalesOrder;
use App\Models\SalesReturn;
use App\Models\SupplierPayment;
use App\Models\SupplierPaymentLine;
use App\Models\WarehouseTransfer;
use App\Observers\AssignsDefaultBranchObserver;
use App\Observers\BankAccountObserver;
use App\Observers\BranchObserver;
use App\Observers\CashTransferLineObserver;
use App\Observers\CashTransferObserver;
use App\Observers\ChartOfAccountObserver;
use App\Observers\ChequeRegisterObserver;
use App\Observers\ContactObserver;
use App\Observers\CurrencyObserver;
use App\Observers\CustomerPaymentObserver;
use App\Observers\DealObserver;
use App\Observers\DebitNoteObserver;
use App\Observers\ExpenseObserver;
use App\Observers\InventoryAdjustmentObserver;
use App\Observers\InvoiceObserver;
use App\Observers\JournalVoucherLineObserver;
use App\Observers\JournalVoucherObserver;
use App\Observers\LeadObserver;
use App\Observers\LoanAccountObserver;
use App\Observers\LoanChargeObserver;
use App\Observers\LoanTopUpObserver;
use App\Observers\PosCashMovementObserver;
use App\Observers\PosReturnObserver;
use App\Observers\PosSaleObserver;
use App\Observers\PosShiftObserver;
use App\Observers\ProductionJournalObserver;
use App\Observers\ProductionOrderObserver;
use App\Observers\ProductObserver;
use App\Observers\ProformaInvoiceObserver;
use App\Observers\PurchaseBillObserver;
use App\Observers\PurchaseOrderObserver;
use App\Observers\QuotationObserver;
use App\Observers\SalesOrderObserver;
use App\Observers\SalesReturnObserver;
use App\Observers\SubsequentJournalVoucherObserver;
use App\Observers\SupplierPaymentLineObserver;
use App\Observers\SupplierPaymentObserver;
use App\Policies\DocumentUploadPolicy;
use App\Services\SaaS\AtomicQuotaManager;
use App\Services\SaaS\NativeBackupManager;
use App\Services\SaaS\PlanFeatureResolver;
use App\Services\SaaS\SubscriptionService;
use App\Services\SmsService;
use App\Support\Branding;
use App\Support\Installer\FroidenDatabaseManager;
use App\Support\Installer\FroidenEnvironmentManager;
use App\Support\Installer\FroidenInstalledFileManager;
use Froiden\LaravelInstaller\Controllers\DatabaseController as PackageDatabaseController;
use Froiden\LaravelInstaller\Controllers\FinalController as PackageFinalController;
use Froiden\LaravelInstaller\Controllers\PermissionsController as PackagePermissionsController;
use Froiden\LaravelInstaller\Helpers\DatabaseManager;
use Froiden\LaravelInstaller\Helpers\EnvironmentManager;
use Froiden\LaravelInstaller\Helpers\InstalledFileManager;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->ensureWritableStorage();

        $this->app->bind(
            InstalledFileManager::class,
            FroidenInstalledFileManager::class,
        );
        $this->app->bind(
            DatabaseManager::class,
            FroidenDatabaseManager::class,
        );
        $this->app->bind(
            EnvironmentManager::class,
            FroidenEnvironmentManager::class,
        );
        $this->app->bind(
            PackageDatabaseController::class,
            DatabaseController::class,
        );
        $this->app->bind(
            PackageFinalController::class,
            FinalController::class,
        );
        $this->app->bind(
            PackagePermissionsController::class,
            PermissionsController::class,
        );

        $this->app->singleton(SmsService::class);
        $this->app->alias(SmsService::class, 'sms');
        $this->app->singleton(FeatureResolver::class, PlanFeatureResolver::class);
        $this->app->singleton(QuotaManager::class, AtomicQuotaManager::class);
        $this->app->singleton(SubscriptionLifecycle::class, SubscriptionService::class);
        $this->app->singleton(BackupManager::class, NativeBackupManager::class);
    }

    /**
     * Guarantee Blade can compile views even on a misconfigured host.
     *
     * Runs at provider registration — before any view (including Laravel's own
     * error page) is rendered. It creates the runtime dirs and tries to make
     * them writable; if storage/framework/views still can't be written (e.g. the
     * web user can't chmod a host-owned directory), it redirects compiled Blade
     * views to a writable temp dir. Without this, a non-writable view-cache dir
     * makes EVERY page — and even the exception page — fail with
     * "File does not exist at path .../storage/framework/views/<hash>.php".
     */
    private function ensureWritableStorage(): void
    {
        $app = storage_path('app');
        $views = storage_path('framework/views');
        $logs = storage_path('logs');

        // Fast path: already usable on a healthy install.
        if (
            is_dir($app) && is_writable($app)
            && is_dir($views) && is_writable($views)
            && is_dir($logs) && is_writable($logs)
        ) {
            return;
        }

        foreach ([
            $app,
            $views,
            storage_path('framework/cache/data'),
            storage_path('framework/sessions'),
            $logs,
            storage_path('app/public'),
            base_path('bootstrap/cache'),
        ] as $dir) {
            if (! is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }
            if (is_dir($dir) && ! is_writable($dir)) {
                @chmod($dir, 0775);
            }
        }

        // If the view cache still isn't writable (host-owned dir we can't chmod),
        // compile Blade views to a writable temp dir so pages still render.
        if (! is_dir($views) || ! is_writable($views)) {
            $fallback = sys_get_temp_dir().DIRECTORY_SEPARATOR.'kiteledger-views-'.substr(md5(base_path()), 0, 12);

            if (! is_dir($fallback)) {
                @mkdir($fallback, 0775, true);
            }

            if (is_dir($fallback) && is_writable($fallback)) {
                config(['view.compiled' => $fallback]);
            }
        }

        // If logs still aren't writable, send logging to PHP's error log instead
        // of the file — otherwise Monolog's StreamHandler throws while trying to
        // open laravel.log and escalates any error into a 500.
        if (! is_dir($logs) || ! is_writable($logs)) {
            config(['logging.default' => 'errorlog']);
        }
    }

    public function boot(): void
    {
        Gate::policy(DocumentUpload::class, DocumentUploadPolicy::class);

        if (! $this->app->runningInConsole() && request()->is('install*')) {
            app()->setLocale('en');
            config(['app.locale' => 'en']);
        }

        View::composer('app', function ($view) {
            $faviconUrl = Branding::faviconUrl();

            $view->with([
                'faviconUrl' => $faviconUrl,
                'faviconMimeType' => Branding::faviconMimeType($faviconUrl),
            ]);
        });

        Gate::before(function ($user, string $ability) {
            if (! empty($user->is_super_admin)) {
                return true;
            }

            if (! method_exists($user, 'hasAnyRole')) {
                return null;
            }

            // Unrestricted / god-mode roles only. Branch Admin was previously
            // here but that silently granted it cross-branch permissions
            // including system.branch.view_all, breaking branch scoping.
            // Full Access User/Admin are kept because FullPermissionUserSeeder
            // explicitly assigns them every permission in the system.
            // Keep this list aligned with BranchScopeService::ABOVE_BRANCH_ROLES.
            return $user->hasAnyRole([
                'Super Admin',
                'Company Owner',
                'Admin',
                'Company Admin',
                'Full Access User',
                'Full Access Admin',
                'super-admin',
                'admin',
            ]) ? true : null;
        });

        ChartOfAccount::observe(ChartOfAccountObserver::class);
        BankAccount::observe(BankAccountObserver::class);
        Branch::observe(BranchObserver::class);
        Currency::observe(CurrencyObserver::class);

        CashTransfer::observe(CashTransferObserver::class);
        CashTransferLine::observe(CashTransferLineObserver::class);

        foreach ([
            CashTransfer::class,
            JournalVoucher::class,
            ChequeRegister::class,
            Quotation::class,
            SalesOrder::class,
            ProformaInvoice::class,
            Invoice::class,
            CustomerPayment::class,
            SalesReturn::class,
            PurchaseOrder::class,
            PurchaseBill::class,
            Expense::class,
            DebitNote::class,
            SupplierPayment::class,
            InventoryAdjustment::class,
            WarehouseTransfer::class,
            PosShift::class,
            PosSale::class,
            PosCashMovement::class,
            PosReturn::class,
            ProductionOrder::class,
            ProductionJournal::class,
        ] as $branchAssignedTransaction) {
            $branchAssignedTransaction::observe(AssignsDefaultBranchObserver::class);
        }

        JournalVoucher::observe(JournalVoucherObserver::class);
        JournalVoucherLine::observe(JournalVoucherLineObserver::class);

        ChequeRegister::observe(ChequeRegisterObserver::class);

        LoanAccount::observe(LoanAccountObserver::class);
        LoanTopUp::observe(LoanTopUpObserver::class);
        LoanCharge::observe(LoanChargeObserver::class);

        Invoice::observe(InvoiceObserver::class);
        CustomerPayment::observe(CustomerPaymentObserver::class);
        PurchaseBill::observe(PurchaseBillObserver::class);
        SupplierPayment::observe(SupplierPaymentObserver::class);
        SupplierPaymentLine::observe(SupplierPaymentLineObserver::class);
        Expense::observe(ExpenseObserver::class);
        SalesReturn::observe(SalesReturnObserver::class);
        DebitNote::observe(DebitNoteObserver::class);
        InventoryAdjustment::observe(InventoryAdjustmentObserver::class);
        Quotation::observe(QuotationObserver::class);
        SalesOrder::observe(SalesOrderObserver::class);
        PurchaseOrder::observe(PurchaseOrderObserver::class);
        ProformaInvoice::observe(ProformaInvoiceObserver::class);

        Contact::observe(ContactObserver::class);
        Product::observe(ProductObserver::class);
        Lead::observe(LeadObserver::class);
        Deal::observe(DealObserver::class);

        PosShift::observe(PosShiftObserver::class);
        PosSale::observe(PosSaleObserver::class);
        PosCashMovement::observe(PosCashMovementObserver::class);
        PosReturn::observe(PosReturnObserver::class);

        ProductionOrder::observe(ProductionOrderObserver::class);
        ProductionJournal::observe(ProductionJournalObserver::class);

        foreach ([
            ChequeRegister::class,
            Invoice::class,
            CustomerPayment::class,
            PurchaseBill::class,
            SupplierPayment::class,
            Expense::class,
            SalesReturn::class,
            DebitNote::class,
            InventoryAdjustment::class,
            LoanTopUp::class,
            LoanCharge::class,
        ] as $accountingTransaction) {
            $accountingTransaction::observe(SubsequentJournalVoucherObserver::class);
        }
    }
}
