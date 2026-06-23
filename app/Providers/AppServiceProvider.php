<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\View;
use App\Support\Branding;

use App\Models\{
    Branch, ChartOfAccount, BankAccount, CashTransfer, CashTransferLine, Currency,
    JournalVoucher, JournalVoucherLine, ChequeRegister,
    LoanAccount, LoanTopUp, LoanCharge,
    Invoice, CustomerPayment, PurchaseBill, SupplierPayment, SupplierPaymentLine,
    Expense, SalesReturn, DebitNote, InventoryAdjustment,
    Quotation, SalesOrder, PurchaseOrder, ProformaInvoice,
    Contact, Product, Lead, Deal,
    PosCashMovement, PosReturn, PosSale, PosShift,
    ProductionOrder, ProductionJournal, WarehouseTransfer
};

use App\Observers\{
    BranchObserver, ChartOfAccountObserver, BankAccountObserver, CurrencyObserver,
    CashTransferObserver, CashTransferLineObserver,
    JournalVoucherObserver, JournalVoucherLineObserver,
    ChequeRegisterObserver,
    LoanAccountObserver, LoanTopUpObserver, LoanChargeObserver,
    InvoiceObserver, CustomerPaymentObserver,
    PurchaseBillObserver, SupplierPaymentObserver, SupplierPaymentLineObserver,
    ExpenseObserver, SalesReturnObserver, DebitNoteObserver,
    InventoryAdjustmentObserver, QuotationObserver,
    SalesOrderObserver, PurchaseOrderObserver, ProformaInvoiceObserver,
    ContactObserver, ProductObserver, LeadObserver, DealObserver,
    PosCashMovementObserver, PosReturnObserver, PosSaleObserver, PosShiftObserver,
    SubsequentJournalVoucherObserver,
    ProductionOrderObserver, ProductionJournalObserver,
    AssignsDefaultBranchObserver
};

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->ensureWritableStorage();

        $this->app->singleton(\App\Services\SmsService::class);
        $this->app->alias(\App\Services\SmsService::class, 'sms');
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
        $views = storage_path('framework/views');
        $logs = storage_path('logs');

        // Fast path: already usable on a healthy install.
        if (is_dir($views) && is_writable($views) && is_dir($logs) && is_writable($logs)) {
            return;
        }

        foreach ([
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
        View::composer('app', function ($view) {
            $faviconUrl = Branding::faviconUrl();

            $view->with([
                'faviconUrl' => $faviconUrl,
                'faviconMimeType' => Branding::faviconMimeType($faviconUrl),
            ]);
        });

        Gate::before(function ($user, string $ability) {
            if (!empty($user->is_super_admin)) {
                return true;
            }

            if (!method_exists($user, 'hasAnyRole')) {
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
