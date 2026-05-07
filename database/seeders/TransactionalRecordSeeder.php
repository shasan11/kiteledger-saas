<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TransactionalRecordSeeder extends Seeder
{
    protected int $perTypeCount = 1000;

    public function run(): void
    {
        DB::transaction(function () {
            $now = now();
            $branchId = $this->ensureBranch($now);
            $currencyId = $this->ensureCurrency($now);
            $cashAccountId = $this->ensureAccount($currencyId, $now);
            $warehouseId = $this->ensureWarehouse($branchId, $now);
            [$arCoaId, $apCoaId, $incomeCoaId, $expenseCoaId, $bankCoaId] = $this->ensureChartOfAccounts($cashAccountId, $branchId, $now);
            $productId = $this->ensureProduct($cashAccountId, $now);
            $customerIds = $this->ensureContacts('customer', 40, $cashAccountId, $now);
            $supplierIds = $this->ensureContacts('supplier', 40, $cashAccountId, $now);

            $this->deletePreviousSeedData();

            $quotationIds = $this->seedQuotations($branchId, $currencyId, $productId, $customerIds, $now, $this->perTypeCount);
            $salesOrderIds = $this->seedSalesOrders($branchId, $currencyId, $warehouseId, $productId, $customerIds, $now, $this->perTypeCount);
            $proformaIds = $this->seedProformaInvoices($branchId, $currencyId, $productId, $customerIds, $now, $this->perTypeCount);
            $invoiceIds = $this->seedInvoices($branchId, $currencyId, $warehouseId, $productId, $customerIds, $now, $this->perTypeCount);
            $this->seedCustomerPayments($branchId, $currencyId, $cashAccountId, $customerIds, $invoiceIds, $now, $this->perTypeCount);
            $this->seedSalesReturns($branchId, $currencyId, $warehouseId, $productId, $customerIds, $now, $this->perTypeCount);

            $purchaseOrderIds = $this->seedPurchaseOrders($branchId, $currencyId, $productId, $supplierIds, $now, $this->perTypeCount);
            $billIds = $this->seedPurchaseBills($branchId, $currencyId, $warehouseId, $productId, $supplierIds, $now, $this->perTypeCount);
            $this->seedExpenses($branchId, $currencyId, $expenseCoaId, $supplierIds, $now, $this->perTypeCount);
            $this->seedDebitNotes($branchId, $currencyId, $warehouseId, $productId, $supplierIds, $now, $this->perTypeCount);
            $this->seedSupplierPayments($branchId, $currencyId, $cashAccountId, $supplierIds, $billIds, $now, $this->perTypeCount);

            $this->seedJournalVouchers($branchId, $currencyId, [$arCoaId, $apCoaId, $incomeCoaId, $expenseCoaId, $bankCoaId], $now, $this->perTypeCount);
        });

        $this->command?->info('Seeded 1000 records for each transactional type: quotations, sales orders, proforma invoices, invoices, customer payments, sales returns, purchase orders, bills, expenses, debit notes, supplier payments, and journal vouchers.');
    }

    protected function deletePreviousSeedData(): void
    {
        $this->deleteChildrenFor('customer_payment_lines', 'customer_payment_id', 'customer_payments', 'payment_no', 'TRX-CP-%');
        DB::table('customer_payments')->where('payment_no', 'like', 'TRX-CP-%')->delete();

        $this->deleteChildrenFor('supplier_payment_lines', 'supplier_payment_id', 'supplier_payments', 'payment_no', 'TRX-SP-%');
        DB::table('supplier_payments')->where('payment_no', 'like', 'TRX-SP-%')->delete();

        $this->deleteChildrenFor('quotation_lines', 'quotation_id', 'quotations', 'quotation_no', 'TRX-QT-%');
        DB::table('quotations')->where('quotation_no', 'like', 'TRX-QT-%')->delete();

        $this->deleteChildrenFor('sales_order_lines', 'sales_order_id', 'sales_orders', 'sales_order_no', 'TRX-SO-%');
        DB::table('sales_orders')->where('sales_order_no', 'like', 'TRX-SO-%')->delete();

        $this->deleteChildrenFor('proforma_invoice_lines', 'proforma_invoice_id', 'proforma_invoices', 'proforma_no', 'TRX-PF-%');
        DB::table('proforma_invoices')->where('proforma_no', 'like', 'TRX-PF-%')->delete();

        $this->deleteChildrenFor('invoice_lines', 'invoice_id', 'invoices', 'invoice_no', 'TRX-INV-%');
        DB::table('invoices')->where('invoice_no', 'like', 'TRX-INV-%')->delete();

        $this->deleteChildrenFor('sales_return_lines', 'sales_return_id', 'sales_returns', 'sales_return_no', 'TRX-SR-%');
        DB::table('sales_returns')->where('sales_return_no', 'like', 'TRX-SR-%')->delete();

        $this->deleteChildrenFor('purchase_order_lines', 'purchase_order_id', 'purchase_orders', 'purchase_order_no', 'TRX-PO-%');
        DB::table('purchase_orders')->where('purchase_order_no', 'like', 'TRX-PO-%')->delete();

        $this->deleteChildrenFor('purchase_bill_lines', 'purchase_bill_id', 'purchase_bills', 'bill_no', 'TRX-BILL-%');
        DB::table('purchase_bills')->where('bill_no', 'like', 'TRX-BILL-%')->delete();

        $this->deleteChildrenFor('expense_lines', 'expense_id', 'expenses', 'expense_no', 'TRX-EXP-%');
        DB::table('expenses')->where('expense_no', 'like', 'TRX-EXP-%')->delete();

        $this->deleteChildrenFor('debit_note_lines', 'debit_note_id', 'debit_notes', 'debit_note_no', 'TRX-DN-%');
        DB::table('debit_notes')->where('debit_note_no', 'like', 'TRX-DN-%')->delete();

        $this->deleteChildrenFor('journal_voucher_lines', 'journal_voucher_id', 'journal_vouchers', 'voucher_no', 'TRX-JV-%');
        DB::table('journal_vouchers')->where('voucher_no', 'like', 'TRX-JV-%')->delete();
    }

    protected function deleteChildrenFor(string $childTable, string $foreignKey, string $parentTable, string $numberColumn, string $pattern): void
    {
        DB::table($childTable)
            ->whereIn($foreignKey, DB::table($parentTable)->select('id')->where($numberColumn, 'like', $pattern))
            ->delete();
    }

    protected function seedQuotations(string $branchId, string $currencyId, string $productId, array $customerIds, Carbon $now, int $count): array
    {
        $ids = [];

        for ($i = 1; $i <= $count; $i++) {
            $id = (string) Str::uuid();
            $total = $this->amount($i);
            $approved = $this->isApproved($i);
            $contactId = $customerIds[$i % count($customerIds)];
            $ids[] = ['id' => $id, 'contact_id' => $contactId, 'total' => $total];

            DB::table('quotations')->insert($this->baseDocumentRow($id, $branchId, $currencyId, $contactId, $approved, $now) + [
                'quotation_no' => sprintf('TRX-QT-%04d', $i),
                'quotation_date' => $this->pastDate($now, $i, 90),
                'expiry_date' => $now->copy()->addDays(15 + ($i % 30))->toDateString(),
                'notes' => 'Bulk receivable seed quotation.',
                'status' => $approved ? 'sent' : 'draft',
                'total' => $total,
            ]);

            $this->insertProductLine('quotation_lines', 'quotation_id', $id, $productId, $i, $total, $now, 'product_name');
        }

        return $ids;
    }

    protected function seedSalesOrders(string $branchId, string $currencyId, string $warehouseId, string $productId, array $customerIds, Carbon $now, int $count): array
    {
        $ids = [];

        for ($i = 1; $i <= $count; $i++) {
            $id = (string) Str::uuid();
            $total = $this->amount($i + 1000);
            $approved = $this->isApproved($i);
            $contactId = $customerIds[$i % count($customerIds)];
            $ids[] = ['id' => $id, 'contact_id' => $contactId, 'total' => $total];

            DB::table('sales_orders')->insert($this->baseDocumentRow($id, $branchId, $currencyId, $contactId, $approved, $now) + [
                'sales_order_no' => sprintf('TRX-SO-%04d', $i),
                'sales_order_date' => $this->pastDate($now, $i, 90),
                'warehouse_id' => $warehouseId,
                'reference' => sprintf('TRX-QT-%04d', $i),
                'notes' => 'Bulk receivable seed sales order.',
                'subtotal' => $total,
                'discount_total' => 0,
                'tax_total' => 0,
                'grand_total' => $total,
                'status' => $approved ? 'confirmed' : 'draft',
                'total' => $total,
            ]);

            $this->insertProductLine('sales_order_lines', 'sales_order_id', $id, $productId, $i, $total, $now);
        }

        return $ids;
    }

    protected function seedProformaInvoices(string $branchId, string $currencyId, string $productId, array $customerIds, Carbon $now, int $count): array
    {
        $ids = [];

        for ($i = 1; $i <= $count; $i++) {
            $id = (string) Str::uuid();
            $total = $this->amount($i + 2000);
            $approved = $this->isApproved($i);
            $contactId = $customerIds[$i % count($customerIds)];
            $ids[] = ['id' => $id, 'contact_id' => $contactId, 'total' => $total];

            DB::table('proforma_invoices')->insert($this->baseDocumentRow($id, $branchId, $currencyId, $contactId, $approved, $now) + [
                'proforma_no' => sprintf('TRX-PF-%04d', $i),
                'reference' => sprintf('TRX-SO-%04d', $i),
                'proforma_date' => $this->pastDate($now, $i, 90),
                'notes' => 'Bulk receivable seed proforma invoice.',
                'status' => $approved ? 'issued' : 'draft',
                'total' => $total,
            ]);

            $this->insertProductLine('proforma_invoice_lines', 'proforma_invoice_id', $id, $productId, $i, $total, $now);
        }

        return $ids;
    }

    protected function seedInvoices(string $branchId, string $currencyId, string $warehouseId, string $productId, array $customerIds, Carbon $now, int $count): array
    {
        $ids = [];

        for ($i = 1; $i <= $count; $i++) {
            $id = (string) Str::uuid();
            $total = $this->amount($i + 3000);
            $approved = $this->isApproved($i);
            $paid = $approved ? round($total * 0.35, 2) : 0;
            $contactId = $customerIds[$i % count($customerIds)];
            $ids[] = ['id' => $id, 'contact_id' => $contactId, 'total' => $total];

            DB::table('invoices')->insert($this->baseDocumentRow($id, $branchId, $currencyId, $contactId, $approved, $now) + [
                'invoice_no' => sprintf('TRX-INV-%04d', $i),
                'invoice_date' => $this->pastDate($now, $i, 90),
                'due_date' => $now->copy()->addDays(30 - ($i % 15))->toDateString(),
                'warehouse_id' => $warehouseId,
                'reference' => sprintf('TRX-SO-%04d', $i),
                'notes' => 'Bulk receivable seed invoice.',
                'paid_total' => $paid,
                'balance_due' => round($total - $paid, 2),
                'status' => $approved ? 'posted' : 'draft',
                'total' => $total,
            ]);

            $this->insertProductLine('invoice_lines', 'invoice_id', $id, $productId, $i, $total, $now);
        }

        return $ids;
    }

    protected function seedCustomerPayments(string $branchId, string $currencyId, string $accountId, array $customerIds, array $invoiceIds, Carbon $now, int $count): void
    {
        for ($i = 1; $i <= $count; $i++) {
            $invoice = $invoiceIds[($i - 1) % count($invoiceIds)];
            $amount = round($invoice['total'] * 0.3, 2);
            $id = (string) Str::uuid();
            $approved = $this->isApproved($i);

            DB::table('customer_payments')->insert($this->basePaymentRow($id, $branchId, $currencyId, $invoice['contact_id'] ?: $customerIds[$i % count($customerIds)], $accountId, $amount, $approved, $now) + [
                'payment_no' => sprintf('TRX-CP-%04d', $i),
                'payment_date' => $this->pastDate($now, $i, 60),
                'payment_method' => 'bank',
                'reference' => sprintf('TRX-INV-%04d', (($i - 1) % count($invoiceIds)) + 1),
                'notes' => 'Bulk receivable payment seed.',
            ]);

            DB::table('customer_payment_lines')->insert([
                'id' => (string) Str::uuid(),
                'customer_payment_id' => $id,
                'invoice_id' => $invoice['id'],
                'allocated_amount' => $amount,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    protected function seedSalesReturns(string $branchId, string $currencyId, string $warehouseId, string $productId, array $customerIds, Carbon $now, int $count): array
    {
        $ids = [];

        for ($i = 1; $i <= $count; $i++) {
            $id = (string) Str::uuid();
            $total = $this->amount($i + 4000);
            $approved = $this->isApproved($i);
            $contactId = $customerIds[$i % count($customerIds)];
            $ids[] = ['id' => $id, 'contact_id' => $contactId, 'total' => $total];

            DB::table('sales_returns')->insert($this->baseDocumentRow($id, $branchId, $currencyId, $contactId, $approved, $now) + [
                'sales_return_no' => sprintf('TRX-SR-%04d', $i),
                'sales_return_date' => $this->pastDate($now, $i, 90),
                'warehouse_id' => $warehouseId,
                'reference' => sprintf('TRX-INV-%04d', $i),
                'notes' => 'Bulk receivable seed sales return.',
                'status' => $approved ? 'posted' : 'draft',
                'total' => $total,
            ]);

            $this->insertProductLine('sales_return_lines', 'sales_return_id', $id, $productId, $i, $total, $now, null, false);
        }

        return $ids;
    }

    protected function seedPurchaseOrders(string $branchId, string $currencyId, string $productId, array $supplierIds, Carbon $now, int $count): array
    {
        $ids = [];

        for ($i = 1; $i <= $count; $i++) {
            $id = (string) Str::uuid();
            $total = $this->amount($i + 5000);
            $approved = $this->isApproved($i);
            $contactId = $supplierIds[$i % count($supplierIds)];
            $ids[] = ['id' => $id, 'contact_id' => $contactId, 'total' => $total];

            DB::table('purchase_orders')->insert($this->baseDocumentRow($id, $branchId, $currencyId, $contactId, $approved, $now) + [
                'purchase_order_no' => sprintf('TRX-PO-%04d', $i),
                'purchase_order_date' => $this->pastDate($now, $i, 90),
                'notes' => 'Bulk payable seed purchase order.',
                'status' => $approved ? 'confirmed' : 'draft',
                'total' => $total,
            ]);

            $this->insertProductLine('purchase_order_lines', 'purchase_order_id', $id, $productId, $i, $total, $now);
        }

        return $ids;
    }

    protected function seedPurchaseBills(string $branchId, string $currencyId, string $warehouseId, string $productId, array $supplierIds, Carbon $now, int $count): array
    {
        $ids = [];

        for ($i = 1; $i <= $count; $i++) {
            $id = (string) Str::uuid();
            $total = $this->amount($i + 6000);
            $approved = $this->isApproved($i);
            $paid = $approved ? round($total * 0.4, 2) : 0;
            $contactId = $supplierIds[$i % count($supplierIds)];
            $ids[] = ['id' => $id, 'contact_id' => $contactId, 'total' => $total];

            DB::table('purchase_bills')->insert($this->baseDocumentRow($id, $branchId, $currencyId, $contactId, $approved, $now) + [
                'bill_no' => sprintf('TRX-BILL-%04d', $i),
                'bill_date' => $this->pastDate($now, $i, 90),
                'due_date' => $now->copy()->addDays(25 - ($i % 10))->toDateString(),
                'warehouse_id' => $warehouseId,
                'reference' => sprintf('TRX-PO-%04d', $i),
                'notes' => 'Bulk payable seed bill.',
                'paid_total' => $paid,
                'balance_due' => round($total - $paid, 2),
                'status' => $approved ? 'posted' : 'draft',
                'total' => $total,
            ]);

            $this->insertProductLine('purchase_bill_lines', 'purchase_bill_id', $id, $productId, $i, $total, $now);
        }

        return $ids;
    }

    protected function seedExpenses(string $branchId, string $currencyId, string $expenseCoaId, array $supplierIds, Carbon $now, int $count): array
    {
        $ids = [];

        for ($i = 1; $i <= $count; $i++) {
            $id = (string) Str::uuid();
            $total = $this->amount($i + 7000);
            $approved = $this->isApproved($i);
            $contactId = $supplierIds[$i % count($supplierIds)];
            $ids[] = ['id' => $id, 'contact_id' => $contactId, 'total' => $total];

            DB::table('expenses')->insert($this->baseDocumentRow($id, $branchId, $currencyId, $contactId, $approved, $now) + [
                'expense_no' => sprintf('TRX-EXP-%04d', $i),
                'expense_date' => $this->pastDate($now, $i, 90),
                'due_date' => $now->copy()->addDays(15 - ($i % 10))->toDateString(),
                'reference' => sprintf('TRX-BILL-%04d', $i),
                'notes' => 'Bulk payable seed expense.',
                'status' => $approved ? 'posted' : 'draft',
                'total' => $total,
            ]);

            $this->insertExpenseLine($id, $expenseCoaId, $i, $total, $now);
        }

        return $ids;
    }

    protected function seedDebitNotes(string $branchId, string $currencyId, string $warehouseId, string $productId, array $supplierIds, Carbon $now, int $count): array
    {
        $ids = [];

        for ($i = 1; $i <= $count; $i++) {
            $id = (string) Str::uuid();
            $total = $this->amount($i + 8000);
            $approved = $this->isApproved($i);
            $contactId = $supplierIds[$i % count($supplierIds)];
            $ids[] = ['id' => $id, 'contact_id' => $contactId, 'total' => $total];

            DB::table('debit_notes')->insert($this->baseDocumentRow($id, $branchId, $currencyId, $contactId, $approved, $now) + [
                'debit_note_no' => sprintf('TRX-DN-%04d', $i),
                'debit_note_date' => $this->pastDate($now, $i, 90),
                'warehouse_id' => $warehouseId,
                'reference' => sprintf('TRX-BILL-%04d', $i),
                'notes' => 'Bulk payable seed debit note.',
                'status' => $approved ? 'posted' : 'draft',
                'total' => $total,
            ]);

            $this->insertProductLine('debit_note_lines', 'debit_note_id', $id, $productId, $i, $total, $now, null, false);
        }

        return $ids;
    }

    protected function seedSupplierPayments(string $branchId, string $currencyId, string $accountId, array $supplierIds, array $billIds, Carbon $now, int $count): void
    {
        for ($i = 1; $i <= $count; $i++) {
            $bill = $billIds[($i - 1) % count($billIds)];
            $amount = round($bill['total'] * 0.32, 2);
            $id = (string) Str::uuid();
            $approved = $this->isApproved($i);

            DB::table('supplier_payments')->insert($this->basePaymentRow($id, $branchId, $currencyId, $bill['contact_id'] ?: $supplierIds[$i % count($supplierIds)], $accountId, $amount, $approved, $now) + [
                'payment_no' => sprintf('TRX-SP-%04d', $i),
                'payment_date' => $this->pastDate($now, $i, 60),
                'method' => 'bank',
                'reference' => sprintf('TRX-BILL-%04d', (($i - 1) % count($billIds)) + 1),
                'notes' => 'Bulk payable payment seed.',
            ]);

            DB::table('supplier_payment_lines')->insert([
                'id' => (string) Str::uuid(),
                'supplier_payment_id' => $id,
                'purchase_bill_id' => $bill['id'],
                'allocated_amount' => $amount,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    protected function seedJournalVouchers(string $branchId, string $currencyId, array $coaIds, Carbon $now, int $count): void
    {
        for ($i = 1; $i <= $count; $i++) {
            $id = (string) Str::uuid();
            $amount = $this->amount($i + 9000);
            $approved = $this->isApproved($i);

            DB::table('journal_vouchers')->insert([
                'id' => $id,
                'branch_id' => $branchId,
                'voucher_no' => sprintf('TRX-JV-%04d', $i),
                'voucher_date' => $this->pastDate($now, $i, 120),
                'currency_id' => $currencyId,
                'reference' => sprintf('TRX-REF-%04d', $i),
                'narration' => 'Bulk core accounting seed voucher.',
                'status' => $approved ? 'posted' : 'draft',
                'active' => true,
                'approved' => $approved,
                'approved_at' => $approved ? $now : null,
                'approved_by_id' => null,
                'void' => false,
                'exchange_rate' => 1,
                'total' => $amount,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('journal_voucher_lines')->insert([
                [
                    'id' => (string) Str::uuid(),
                    'journal_voucher_id' => $id,
                    'chart_of_account_id' => $coaIds[$i % count($coaIds)],
                    'description' => 'Seed debit line',
                    'debit' => $amount,
                    'credit' => 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'id' => (string) Str::uuid(),
                    'journal_voucher_id' => $id,
                    'chart_of_account_id' => $coaIds[($i + 1) % count($coaIds)],
                    'description' => 'Seed credit line',
                    'debit' => 0,
                    'credit' => $amount,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ]);
        }
    }

    protected function baseDocumentRow(string $id, string $branchId, string $currencyId, string $contactId, bool $approved, Carbon $now): array
    {
        return [
            'id' => $id,
            'branch_id' => $branchId,
            'contact_id' => $contactId,
            'currency_id' => $currencyId,
            'active' => true,
            'approved' => $approved,
            'approved_at' => $approved ? $now : null,
            'approved_by_id' => null,
            'void' => false,
            'exchange_rate' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    protected function basePaymentRow(string $id, string $branchId, string $currencyId, string $contactId, string $accountId, float $amount, bool $approved, Carbon $now): array
    {
        return [
            'id' => $id,
            'branch_id' => $branchId,
            'contact_id' => $contactId,
            'account_id' => $accountId,
            'currency_id' => $currencyId,
            'amount' => $amount,
            'status' => $approved ? 'posted' : 'draft',
            'active' => true,
            'approved' => $approved,
            'approved_at' => $approved ? $now : null,
            'approved_by_id' => null,
            'void' => false,
            'exchange_rate' => 1,
            'total' => $amount,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    protected function insertProductLine(
        string $table,
        string $foreignKey,
        string $parentId,
        string $productId,
        int $index,
        float $total,
        Carbon $now,
        ?string $nameColumn = 'custom_product_name',
        bool $includeDiscount = true
    ): void {
        $row = [
            'id' => (string) Str::uuid(),
            $foreignKey => $parentId,
            'product_id' => $productId,
            'description' => 'Inline transactional seed line item.',
            'qty' => 1 + ($index % 5),
            'unit_price' => round($total / (1 + ($index % 5)), 2),
            'tax_amount' => 0,
            'line_total' => $total,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        if ($nameColumn) {
            $row[$nameColumn] = 'Transactional Seed Item';
        }

        if ($includeDiscount) {
            $row['discount_percent'] = 0;
        }

        DB::table($table)->insert($row);
    }

    protected function insertExpenseLine(string $expenseId, string $expenseCoaId, int $index, float $total, Carbon $now): void
    {
        DB::table('expense_lines')->insert([
            'id' => (string) Str::uuid(),
            'expense_id' => $expenseId,
            'chart_of_account_id' => $expenseCoaId,
            'description' => 'Inline transactional expense seed line.',
            'amount' => $total,
            'tax_amount' => 0,
            'line_total' => $total,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    protected function amount(int $index): float
    {
        return (float) (1000 + (($index * 137) % 9000));
    }

    protected function isApproved(int $index): bool
    {
        return $index % 2 === 0;
    }

    protected function pastDate(Carbon $now, int $index, int $range): string
    {
        return $now->copy()->subDays($index % $range)->toDateString();
    }

    protected function ensureBranch(Carbon $now): string
    {
        return DB::table('branches')->where('code', 'MAIN')->value('id')
            ?: tap((string) Str::uuid(), fn ($id) => DB::table('branches')->insert([
                'id' => $id, 'code' => 'MAIN', 'name' => 'Main Branch', 'is_head_office' => true,
                'is_transaction_enabled' => true, 'active' => true, 'is_system_generated' => true,
                'created_at' => $now, 'updated_at' => $now,
            ]));
    }

    protected function ensureCurrency(Carbon $now): string
    {
        return DB::table('currencies')->where('code', 'NPR')->value('id')
            ?: tap((string) Str::uuid(), fn ($id) => DB::table('currencies')->insert([
                'id' => $id, 'code' => 'NPR', 'name' => 'Nepalese Rupee', 'symbol' => 'Rs',
                'decimal_places' => 2, 'is_base' => true, 'active' => true, 'is_system_generated' => true,
                'created_at' => $now, 'updated_at' => $now,
            ]));
    }

    protected function ensureAccount(string $currencyId, Carbon $now): string
    {
        return DB::table('accounts')->where('code', 'TRX-CASH')->value('id')
            ?: tap((string) Str::uuid(), fn ($id) => DB::table('accounts')->insert([
                'id' => $id, 'name' => 'Transactional Seed Cash', 'code' => 'TRX-CASH',
                'nature' => 'cash', 'currency_id' => $currencyId, 'active' => true,
                'is_system_generated' => true, 'created_at' => $now, 'updated_at' => $now,
            ]));
    }

    protected function ensureWarehouse(string $branchId, Carbon $now): string
    {
        return DB::table('warehouses')->where('code', 'TRX-WH')->value('id')
            ?: tap((string) Str::uuid(), fn ($id) => DB::table('warehouses')->insert([
                'id' => $id, 'branch_id' => $branchId, 'code' => 'TRX-WH', 'name' => 'Transactional Seed Warehouse',
                'active' => true, 'is_system_generated' => true, 'created_at' => $now, 'updated_at' => $now,
            ]));
    }

    protected function ensureChartOfAccounts(string $accountId, string $branchId, Carbon $now): array
    {
        $rows = [
            ['TRX-AR', 'Seed Accounts Receivable', 'asset'],
            ['TRX-AP', 'Seed Accounts Payable', 'liability'],
            ['TRX-SALES', 'Seed Sales Income', 'income'],
            ['TRX-EXP', 'Seed Purchase Expense', 'expense'],
            ['TRX-BANK', 'Seed Bank', 'asset'],
        ];

        return collect($rows)->map(function ($row) use ($accountId, $branchId, $now) {
            return DB::table('chart_of_accounts')->where('code', $row[0])->value('id')
                ?: tap((string) Str::uuid(), fn ($id) => DB::table('chart_of_accounts')->insert([
                    'id' => $id, 'account_id' => $accountId, 'branch_id' => $branchId,
                    'type' => $row[2], 'code' => $row[0], 'name' => $row[1],
                    'active' => true, 'is_system_generated' => true,
                    'created_at' => $now, 'updated_at' => $now,
                ]));
        })->all();
    }

    protected function ensureProduct(string $accountId, Carbon $now): string
    {
        return DB::table('products')->where('code', 'TRX-ITEM')->value('id')
            ?: tap((string) Str::uuid(), fn ($id) => DB::table('products')->insert([
                'id' => $id, 'name' => 'Transactional Seed Item', 'code' => 'TRX-ITEM', 'sku' => 'TRX-ITEM',
                'description' => 'Reusable line item for bulk transaction seeding.', 'product_type' => 'simple',
                'sales_account_id' => $accountId, 'purchase_account_id' => $accountId,
                'sales_return_account_id' => $accountId, 'purchase_return_account_id' => $accountId,
                'purchase_price' => 800, 'selling_price' => 1200, 'track_inventory' => false,
                'allow_sale' => true, 'allow_purchase' => true, 'active' => true, 'is_system_generated' => true,
                'created_at' => $now, 'updated_at' => $now,
            ]));
    }

    protected function ensureContacts(string $type, int $count, string $accountId, Carbon $now): array
    {
        $ids = [];

        for ($i = 1; $i <= $count; $i++) {
            $code = sprintf('TRX-%s-%03d', strtoupper(substr($type, 0, 3)), $i);
            $ids[] = DB::table('contacts')->where('code', $code)->value('id')
                ?: tap((string) Str::uuid(), fn ($id) => DB::table('contacts')->insert([
                    'id' => $id, 'account_id' => $accountId, 'contact_type' => $type,
                    'name' => sprintf('Transactional Seed %s %03d', ucfirst($type), $i),
                    'code' => $code, 'email' => strtolower($code) . '@example.test',
                    'accept_purchase' => $type === 'supplier', 'active' => true, 'is_system_generated' => true,
                    'created_at' => $now, 'updated_at' => $now,
                ]));
        }

        return $ids;
    }
}
