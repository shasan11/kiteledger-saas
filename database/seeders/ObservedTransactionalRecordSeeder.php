<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\Currency;
use App\Models\CustomerPayment;
use App\Models\CustomerPaymentLine;
use App\Models\DebitNote;
use App\Models\DebitNoteLine;
use App\Models\Expense;
use App\Models\ExpenseLine;
use App\Models\Invoice;
use App\Models\InvoiceLine;
use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use App\Models\Product;
use App\Models\ProformaInvoice;
use App\Models\ProformaInvoiceLine;
use App\Models\PurchaseBill;
use App\Models\PurchaseBillLine;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderLine;
use App\Models\Quotation;
use App\Models\QuotationLine;
use App\Models\SalesOrder;
use App\Models\SalesOrderLine;
use App\Models\SalesReturn;
use App\Models\SalesReturnLine;
use App\Models\SupplierPayment;
use App\Models\SupplierPaymentLine;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ObservedTransactionalRecordSeeder extends Seeder
{
    protected int $perTypeCount = 10;

    protected Branch $branch;

    protected Currency $currency;

    protected Warehouse $warehouse;

    protected Product $product;

    protected Account $cashAccount;

    protected Account $expenseAccount;

    protected ChartOfAccount $cashChart;

    protected ChartOfAccount $expenseChart;

    public function run(): void
    {
        $this->perTypeCount = (int) env('OBSERVED_TRANSACTION_SEED_COUNT', $this->perTypeCount);

        $this->prepareReferenceData();
        $this->deletePreviousSeedData();

        $customers = $this->ensureContacts('customer', max(5, min($this->perTypeCount, 20)));
        $suppliers = $this->ensureContacts('supplier', max(5, min($this->perTypeCount, 20)));

        for ($i = 1; $i <= $this->perTypeCount; $i++) {
            $customer = $customers[($i - 1) % count($customers)];
            $supplier = $suppliers[($i - 1) % count($suppliers)];

            $quotation = $this->createQuotation($i, $customer);
            $this->approve($quotation, 'sent');

            $salesOrder = $this->createSalesOrder($i, $customer, $quotation->quotation_no);
            $this->approve($salesOrder, 'confirmed');

            $proforma = $this->createProformaInvoice($i, $customer, $salesOrder->sales_order_no);
            $this->approve($proforma, 'issued');

            $invoice = $this->createInvoice($i, $customer, $salesOrder->sales_order_no);
            $this->approve($invoice, 'posted');

            $customerPayment = $this->createCustomerPayment($i, $customer, $invoice);
            $this->approve($customerPayment, 'posted');

            $salesReturn = $this->createSalesReturn($i, $customer, $invoice->invoice_no);
            $this->approve($salesReturn, 'posted');

            $purchaseOrder = $this->createPurchaseOrder($i, $supplier);
            $this->approve($purchaseOrder, 'confirmed');

            $purchaseBill = $this->createPurchaseBill($i, $supplier, $purchaseOrder->purchase_order_no);
            $this->approve($purchaseBill, 'posted');

            $expense = $this->createExpense($i, $supplier, $purchaseBill->bill_no);
            $this->approve($expense, 'posted');

            $debitNote = $this->createDebitNote($i, $supplier, $purchaseBill->bill_no);
            $this->approve($debitNote, 'posted');

            $supplierPayment = $this->createSupplierPayment($i, $supplier, $purchaseBill);
            $this->approve($supplierPayment, 'posted');

            $journalVoucher = $this->createJournalVoucher($i);
            $this->approve($journalVoucher, 'posted');
        }

        $this->command?->info(
            "Seeded {$this->perTypeCount} observed records for each sales, purchase, payment, expense, debit note, and journal voucher transaction type."
        );
    }

    protected function prepareReferenceData(): void
    {
        $this->branch = $this->firstOrCreate(Branch::class,
            ['code' => 'OBS-MAIN'],
            [
                'name' => 'Observed Seed Branch',
                'is_head_office' => false,
                'is_transaction_enabled' => true,
                'is_pos_enabled' => true,
                'is_warehouse_enabled' => true,
                'active' => true,
                'is_system_generated' => true,
            ]
        );

        $this->currency = Currency::query()->where('is_base', true)->first()
            ?? $this->firstOrCreate(Currency::class,
                ['code' => 'NPR'],
                [
                    'name' => 'Nepalese Rupee',
                    'symbol' => 'Rs',
                    'decimal_places' => 2,
                    'exchange_rate' => 1,
                    'is_base' => true,
                    'active' => true,
                    'is_system_generated' => true,
                ]
            );

        $this->cashChart = $this->ensureChartAccount('1110', 'Cash in Hand', 'asset', 'cash');
        $this->ensureChartAccount('1120', 'Bank Accounts', 'asset', 'bank');
        $this->ensureChartAccount('1130', 'Accounts Receivable', 'asset', 'actor');
        $this->ensureChartAccount('1150', 'Tax Receivable', 'asset', 'asset');
        $this->ensureChartAccount('2110', 'Accounts Payable', 'liability', 'actor');
        $this->ensureChartAccount('2120', 'Tax Payable', 'liability', 'liability');
        $this->ensureChartAccount('4100', 'Sales Income', 'income', 'income');
        $this->expenseChart = $this->ensureChartAccount('5100', 'Purchase Expense', 'expense', 'expense');

        $this->cashAccount = $this->cashChart->account()->firstOrFail();
        $this->expenseAccount = $this->expenseChart->account()->firstOrFail();

        $this->warehouse = $this->firstOrCreate(Warehouse::class,
            ['code' => 'OBS-WH'],
            [
                'branch_id' => $this->branch->id,
                'name' => 'Observed Seed Warehouse',
                'active' => true,
                'is_system_generated' => true,
            ]
        );

        $this->product = $this->firstOrCreate(Product::class,
            ['sku' => 'OBS-ITEM'],
            [
                'branch_id' => $this->branch->id,
                'name' => 'Observed Seed Item',
                'code' => 'OBS-ITEM',
                'description' => 'Reusable item for observer-aware transaction seeding.',
                'product_type' => 'simple',
                'sales_account_id' => $this->cashAccount->id,
                'purchase_account_id' => $this->expenseAccount->id,
                'sales_return_account_id' => $this->cashAccount->id,
                'purchase_return_account_id' => $this->expenseAccount->id,
                'purchase_price' => 800,
                'selling_price' => 1200,
                'track_inventory' => false,
                'allow_sale' => true,
                'allow_purchase' => true,
                'active' => true,
                'is_system_generated' => true,
            ]
        );
    }

    protected function ensureChartAccount(string $code, string $name, string $type, string $nature): ChartOfAccount
    {
        $chart = ChartOfAccount::query()->where('code', $code)->first();

        if ($chart) {
            if (! $chart->account_id) {
                $chart->forceFill([
                    'account_id' => $this->ensureAccount($code, $name, $nature)->id,
                    'active' => true,
                ])->save();
            }

            return $chart->refresh();
        }

        return $this->create(ChartOfAccount::class, [
            'account_id' => $this->ensureAccount($code, $name, $nature)->id,
            'branch_id' => $this->branch->id,
            'currency_id' => $this->currency->id,
            'type' => $type,
            'code' => $code,
            'name' => $name,
            'active' => true,
            'is_system_generated' => true,
        ]);
    }

    protected function ensureAccount(string $code, string $name, string $nature): Account
    {
        return $this->firstOrCreate(Account::class,
            ['code' => "OBS-{$code}"],
            [
                'name' => $name,
                'nature' => $nature,
                'currency_id' => $this->currency->id,
                'active' => true,
                'is_system_generated' => true,
            ]
        );
    }

    protected function ensureContacts(string $type, int $count): array
    {
        $contacts = [];

        for ($i = 1; $i <= $count; $i++) {
            $code = sprintf('OBS-%s-%03d', strtoupper(substr($type, 0, 3)), $i);

            $contact = $this->firstOrCreate(Contact::class,
                ['code' => $code],
                [
                    'contact_type' => $type,
                    'name' => sprintf('Observed Seed %s %03d', ucfirst($type), $i),
                    'email' => strtolower($code) . '@example.test',
                    'accept_purchase' => $type === 'supplier',
                    'active' => true,
                    'is_system_generated' => true,
                ]
            );

            if ($type === 'supplier' && ! $contact->payable_account_id) {
                $contact->forceFill(['accept_purchase' => true])->save();
            }

            $contacts[] = $contact->refresh();
        }

        return $contacts;
    }

    protected function createQuotation(int $i, Contact $contact): Quotation
    {
        $total = $this->amount($i);
        $quotation = $this->create(Quotation::class, $this->documentPayload($contact, $total) + [
            'quotation_no' => sprintf('OBS-QT-%04d', $i),
            'quotation_date' => $this->pastDate($i, 90),
            'expiry_date' => now()->addDays(15)->toDateString(),
            'notes' => 'Observer-aware seed quotation.',
            'status' => 'draft',
        ]);

        $this->create(QuotationLine::class, $this->productLinePayload('quotation_id', $quotation->id, $total));

        return $quotation;
    }

    protected function createSalesOrder(int $i, Contact $contact, string $reference): SalesOrder
    {
        $total = $this->amount($i + 1000);
        $salesOrder = $this->create(SalesOrder::class, $this->documentPayload($contact, $total) + [
            'sales_order_no' => sprintf('OBS-SO-%04d', $i),
            'sales_order_date' => $this->pastDate($i, 90),
            'warehouse_id' => $this->warehouse->id,
            'reference' => $reference,
            'notes' => 'Observer-aware seed sales order.',
            'subtotal' => $total,
            'discount_total' => 0,
            'tax_total' => 0,
            'grand_total' => $total,
            'status' => 'draft',
        ]);

        $this->create(SalesOrderLine::class, $this->productLinePayload('sales_order_id', $salesOrder->id, $total));

        return $salesOrder;
    }

    protected function createProformaInvoice(int $i, Contact $contact, string $reference): ProformaInvoice
    {
        $total = $this->amount($i + 2000);
        $proforma = $this->create(ProformaInvoice::class, $this->documentPayload($contact, $total) + [
            'proforma_no' => sprintf('OBS-PF-%04d', $i),
            'reference' => $reference,
            'proforma_date' => $this->pastDate($i, 90),
            'notes' => 'Observer-aware seed proforma invoice.',
            'status' => 'draft',
        ]);

        $this->create(ProformaInvoiceLine::class,
            $this->productLinePayload('proforma_invoice_id', $proforma->id, $total, 'custom_product_name')
        );

        return $proforma;
    }

    protected function createInvoice(int $i, Contact $contact, string $reference): Invoice
    {
        $total = $this->amount($i + 3000);
        $invoice = $this->create(Invoice::class, $this->documentPayload($contact, $total) + [
            'invoice_no' => sprintf('OBS-INV-%04d', $i),
            'invoice_date' => $this->pastDate($i, 90),
            'due_date' => now()->addDays(30)->toDateString(),
            'warehouse_id' => $this->warehouse->id,
            'reference' => $reference,
            'notes' => 'Observer-aware seed invoice.',
            'paid_total' => 0,
            'balance_due' => $total,
            'status' => 'draft',
        ]);

        $this->create(InvoiceLine::class, $this->productLinePayload('invoice_id', $invoice->id, $total));

        return $invoice;
    }

    protected function createCustomerPayment(int $i, Contact $contact, Invoice $invoice): CustomerPayment
    {
        $amount = round((float) $invoice->total * 0.30, 2);
        $payment = $this->create(CustomerPayment::class, $this->paymentPayload($contact, $amount) + [
            'payment_no' => sprintf('OBS-CP-%04d', $i),
            'payment_date' => $this->pastDate($i, 60),
            'payment_method' => 'bank',
            'reference' => $invoice->invoice_no,
            'notes' => 'Observer-aware seed customer payment.',
        ]);

        $this->create(CustomerPaymentLine::class, [
            'customer_payment_id' => $payment->id,
            'invoice_id' => $invoice->id,
            'allocated_amount' => $amount,
        ]);

        return $payment;
    }

    protected function createSalesReturn(int $i, Contact $contact, string $reference): SalesReturn
    {
        $total = round($this->amount($i + 4000) * 0.30, 2);
        $return = $this->create(SalesReturn::class, $this->documentPayload($contact, $total) + [
            'sales_return_no' => sprintf('OBS-SR-%04d', $i),
            'sales_return_date' => $this->pastDate($i, 90),
            'warehouse_id' => $this->warehouse->id,
            'reference' => $reference,
            'notes' => 'Observer-aware seed sales return.',
            'status' => 'draft',
            'has_refund' => false,
            'refund_amount' => 0,
        ]);

        $this->create(SalesReturnLine::class, $this->productLinePayload('sales_return_id', $return->id, $total));

        return $return;
    }

    protected function createPurchaseOrder(int $i, Contact $contact): PurchaseOrder
    {
        $total = $this->amount($i + 5000);
        $purchaseOrder = $this->create(PurchaseOrder::class, $this->documentPayload($contact, $total) + [
            'purchase_order_no' => sprintf('OBS-PO-%04d', $i),
            'purchase_order_date' => $this->pastDate($i, 90),
            'notes' => 'Observer-aware seed purchase order.',
            'status' => 'draft',
        ]);

        $this->create(PurchaseOrderLine::class, $this->productLinePayload('purchase_order_id', $purchaseOrder->id, $total));

        return $purchaseOrder;
    }

    protected function createPurchaseBill(int $i, Contact $contact, string $reference): PurchaseBill
    {
        $total = $this->amount($i + 6000);
        $bill = $this->create(PurchaseBill::class, $this->documentPayload($contact, $total) + [
            'bill_no' => sprintf('OBS-BILL-%04d', $i),
            'bill_date' => $this->pastDate($i, 90),
            'due_date' => now()->addDays(25)->toDateString(),
            'warehouse_id' => $this->warehouse->id,
            'reference' => $reference,
            'notes' => 'Observer-aware seed purchase bill.',
            'paid_total' => 0,
            'balance_due' => $total,
            'status' => 'draft',
        ]);

        $this->create(PurchaseBillLine::class, $this->productLinePayload('purchase_bill_id', $bill->id, $total));

        return $bill;
    }

    protected function createExpense(int $i, Contact $contact, string $reference): Expense
    {
        $total = $this->amount($i + 7000);
        $expense = $this->create(Expense::class, $this->documentPayload($contact, $total) + [
            'expense_no' => sprintf('OBS-EXP-%04d', $i),
            'reference' => $reference,
            'expense_date' => $this->pastDate($i, 90),
            'due_date' => now()->addDays(15)->toDateString(),
            'notes' => 'Observer-aware seed expense.',
            'status' => 'draft',
        ]);

        $this->create(ExpenseLine::class, [
            'expense_id' => $expense->id,
            'account_id' => $this->expenseAccount->id,
            'chart_of_account_id' => $this->expenseChart->id,
            'description' => 'Observed seed expense line.',
            'amount' => $total,
            'tax_amount' => 0,
            'line_total' => $total,
        ]);

        return $expense;
    }

    protected function createDebitNote(int $i, Contact $contact, string $reference): DebitNote
    {
        $total = round($this->amount($i + 8000) * 0.30, 2);
        $debitNote = $this->create(DebitNote::class, $this->documentPayload($contact, $total) + [
            'debit_note_no' => sprintf('OBS-DN-%04d', $i),
            'debit_note_date' => $this->pastDate($i, 90),
            'warehouse_id' => $this->warehouse->id,
            'reference' => $reference,
            'notes' => 'Observer-aware seed debit note.',
            'status' => 'draft',
        ]);

        $this->create(DebitNoteLine::class, $this->productLinePayload('debit_note_id', $debitNote->id, $total));

        return $debitNote;
    }

    protected function createSupplierPayment(int $i, Contact $contact, PurchaseBill $bill): SupplierPayment
    {
        $amount = round((float) $bill->total * 0.32, 2);
        $payment = $this->create(SupplierPayment::class, $this->paymentPayload($contact, $amount) + [
            'payment_no' => sprintf('OBS-SP-%04d', $i),
            'payment_date' => $this->pastDate($i, 60),
            'method' => 'bank',
            'reference' => $bill->bill_no,
            'notes' => 'Observer-aware seed supplier payment.',
        ]);

        $this->create(SupplierPaymentLine::class, [
            'supplier_payment_id' => $payment->id,
            'purchase_bill_id' => $bill->id,
            'allocated_amount' => $amount,
        ]);

        return $payment;
    }

    protected function createJournalVoucher(int $i): JournalVoucher
    {
        $amount = $this->amount($i + 9000);
        $voucher = $this->create(JournalVoucher::class, [
            'branch_id' => $this->branch->id,
            'voucher_no' => sprintf('OBS-JV-%04d', $i),
            'voucher_date' => $this->pastDate($i, 120),
            'currency_id' => $this->currency->id,
            'reference' => sprintf('OBS-REF-%04d', $i),
            'narration' => 'Observer-aware seed voucher.',
            'status' => 'draft',
            'active' => true,
            'approved' => false,
            'void' => false,
            'exchange_rate' => 1,
            'total' => $amount,
        ]);

        $this->create(JournalVoucherLine::class, [
            'journal_voucher_id' => $voucher->id,
            'account_id' => $this->cashAccount->id,
            'description' => 'Observed seed debit line',
            'debit' => $amount,
            'credit' => 0,
        ]);

        $this->create(JournalVoucherLine::class, [
            'journal_voucher_id' => $voucher->id,
            'account_id' => $this->expenseAccount->id,
            'description' => 'Observed seed credit line',
            'debit' => 0,
            'credit' => $amount,
        ]);

        return $voucher;
    }

    protected function approve($model, string $status): void
    {
        $model->forceFill([
            'status' => $status,
            'approved' => true,
            'approved_at' => now(),
        ])->save();
    }

    protected function documentPayload(Contact $contact, float $total): array
    {
        return [
            'branch_id' => $this->branch->id,
            'contact_id' => $contact->id,
            'currency_id' => $this->currency->id,
            'active' => true,
            'approved' => false,
            'void' => false,
            'exchange_rate' => 1,
            'total' => $total,
        ];
    }

    protected function paymentPayload(Contact $contact, float $amount): array
    {
        return [
            'branch_id' => $this->branch->id,
            'contact_id' => $contact->id,
            'account_id' => $this->cashAccount->id,
            'currency_id' => $this->currency->id,
            'amount' => $amount,
            'status' => 'draft',
            'active' => true,
            'approved' => false,
            'void' => false,
            'exchange_rate' => 1,
            'total' => $amount,
        ];
    }

    protected function productLinePayload(string $foreignKey, string $parentId, float $total, string $nameColumn = 'product_name'): array
    {
        $qty = 2;
        $unitPrice = round($total / $qty, 2);

        return [
            $foreignKey => $parentId,
            'product_id' => $this->product->id,
            $nameColumn => $this->product->name,
            'description' => 'Observed seed line item.',
            'qty' => $qty,
            'unit_price' => $unitPrice,
            'discount_type' => 'amount',
            'discount_percent' => 0,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'line_total' => $total,
        ];
    }

    protected function deletePreviousSeedData(): void
    {
        $autoVoucherIds = JournalVoucher::query()
            ->where('is_auto_generated', true)
            ->where('source_no', 'like', 'OBS-%')
            ->pluck('id');

        if ($autoVoucherIds->isNotEmpty()) {
            DB::table('journal_voucher_lines')->whereIn('journal_voucher_id', $autoVoucherIds)->delete();
            DB::table('journal_vouchers')->whereIn('id', $autoVoucherIds)->delete();
        }

        $patterns = [
            ['customer_payment_lines', 'customer_payment_id', CustomerPayment::class, 'payment_no', 'OBS-CP-%'],
            ['supplier_payment_lines', 'supplier_payment_id', SupplierPayment::class, 'payment_no', 'OBS-SP-%'],
            ['quotation_lines', 'quotation_id', Quotation::class, 'quotation_no', 'OBS-QT-%'],
            ['sales_order_lines', 'sales_order_id', SalesOrder::class, 'sales_order_no', 'OBS-SO-%'],
            ['proforma_invoice_lines', 'proforma_invoice_id', ProformaInvoice::class, 'proforma_no', 'OBS-PF-%'],
            ['invoice_lines', 'invoice_id', Invoice::class, 'invoice_no', 'OBS-INV-%'],
            ['sales_return_lines', 'sales_return_id', SalesReturn::class, 'sales_return_no', 'OBS-SR-%'],
            ['purchase_order_lines', 'purchase_order_id', PurchaseOrder::class, 'purchase_order_no', 'OBS-PO-%'],
            ['purchase_bill_lines', 'purchase_bill_id', PurchaseBill::class, 'bill_no', 'OBS-BILL-%'],
            ['expense_lines', 'expense_id', Expense::class, 'expense_no', 'OBS-EXP-%'],
            ['debit_note_lines', 'debit_note_id', DebitNote::class, 'debit_note_no', 'OBS-DN-%'],
            ['journal_voucher_lines', 'journal_voucher_id', JournalVoucher::class, 'voucher_no', 'OBS-JV-%'],
        ];

        foreach ($patterns as [$childTable, $foreignKey, $modelClass, $numberColumn, $pattern]) {
            $parent = new $modelClass;

            if (
                ! Schema::hasTable($childTable)
                || ! Schema::hasTable($parent->getTable())
                || ! Schema::hasColumn($parent->getTable(), $numberColumn)
            ) {
                continue;
            }

            $ids = $modelClass::query()
                ->where($numberColumn, 'like', $pattern)
                ->pluck('id');

            if ($ids->isEmpty()) {
                continue;
            }

            DB::table($childTable)->whereIn($foreignKey, $ids)->delete();
            $modelClass::query()->whereIn('id', $ids)->delete();
        }
    }

    protected function firstOrCreate(string $modelClass, array $attributes, array $values)
    {
        $model = new $modelClass;
        $table = $model->getTable();

        return $modelClass::unguarded(fn () => $modelClass::query()->firstOrCreate(
            $this->onlyExistingColumns($table, $attributes),
            $this->onlyExistingColumns($table, $values)
        ));
    }

    protected function create(string $modelClass, array $attributes)
    {
        $model = new $modelClass;

        return $modelClass::unguarded(fn () => $modelClass::query()->create(
            $this->onlyExistingColumns($model->getTable(), $attributes)
        ));
    }

    protected function onlyExistingColumns(string $table, array $attributes): array
    {
        if (! Schema::hasTable($table)) {
            return $attributes;
        }

        $columns = Schema::getColumnListing($table);

        return array_filter(
            $attributes,
            fn (string $column): bool => in_array($column, $columns, true),
            ARRAY_FILTER_USE_KEY
        );
    }

    protected function amount(int $index): float
    {
        return (float) (1000 + (($index * 137) % 9000));
    }

    protected function pastDate(int $index, int $range): string
    {
        return Carbon::now()->subDays($index % $range)->toDateString();
    }
}
