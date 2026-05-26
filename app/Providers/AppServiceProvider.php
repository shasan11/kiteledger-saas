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
    ProductionOrder, ProductionJournal
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
    ProductionOrderObserver, ProductionJournalObserver
};

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
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

            return $user->hasAnyRole([
                'Super Admin',
                'Company Owner',
                'Admin',
                'Branch Admin',
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
