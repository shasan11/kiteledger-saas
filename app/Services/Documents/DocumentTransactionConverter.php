<?php

namespace App\Services\Documents;

use App\Models\CustomerPayment;
use App\Models\DebitNote;
use App\Models\DebitNoteLine;
use App\Models\DocumentLink;
use App\Models\DocumentTransactionProposal;
use App\Models\Expense;
use App\Models\ExpenseLine;
use App\Models\Invoice;
use App\Models\InvoiceLine;
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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class DocumentTransactionConverter
{
    public function __construct(protected DocumentAuditService $audit) {}

    /**
     * Convert a proposal into a draft transaction record.
     * Returns ['record_id', 'record_type', 'open_url'].
     */
    public function convert(DocumentTransactionProposal $proposal): array
    {
        if ($proposal->status === 'converted') {
            throw new RuntimeException('Proposal already converted.');
        }
        if (!empty($proposal->missing_fields)) {
            throw new RuntimeException('Proposal has missing required fields: ' . implode(', ', $proposal->missing_fields));
        }

        $payload = $proposal->payload ?? [];

        $result = DB::transaction(function () use ($proposal, $payload) {
            return match ($proposal->transaction_type) {
                'purchase_bill' => $this->createPurchaseBill($payload),
                'invoice' => $this->createInvoice($payload),
                'expense' => $this->createExpense($payload),
                'customer_payment' => $this->createCustomerPayment($payload),
                'supplier_payment' => $this->createSupplierPayment($payload),
                'credit_note' => $this->createCreditNote($payload),
                'debit_note' => $this->createDebitNote($payload),
                'purchase_order' => $this->createPurchaseOrder($payload),
                'sales_order' => $this->createSalesOrder($payload),
                'quotation' => $this->createQuotation($payload),
                default => throw new RuntimeException('Unsupported transaction type: ' . $proposal->transaction_type),
            };
        });

        $proposal->update([
            'status' => 'converted',
            'created_record_type' => $result['record_type'],
            'created_record_id' => $result['record_id'],
            'converted_at' => now(),
        ]);

        $proposal->documentUpload->update(['status' => 'converted']);

        DocumentLink::create([
            'document_upload_id' => $proposal->document_upload_id,
            'linkable_type' => $result['record_type'],
            'linkable_id' => $result['record_id'],
            'created_by' => auth()->id(),
        ]);

        $this->audit->log('proposal.converted', [
            'proposal_id' => $proposal->id,
            'transaction_type' => $proposal->transaction_type,
            'record_id' => $result['record_id'],
        ]);

        return $result;
    }

    private function baseDraftFields(array $payload, array $required = []): array
    {
        $branchId = $payload['branch_id'] ?? auth()->user()?->branch_id ?? null;
        return [
            'branch_id' => $branchId,
            'contact_id' => $payload['contact_id'] ?? null,
            'currency_id' => $payload['currency_id'] ?? null,
            'reference' => $payload['reference'] ?? null,
            'notes' => $payload['notes'] ?? null,
            'status' => 'draft',
            'active' => true,
            'approved' => false,
            'void' => false,
            'exchange_rate' => $payload['exchange_rate'] ?? 1,
            'total' => $payload['total'] ?? 0,
            'user_add_id' => auth()->id(),
        ];
    }

    private function mapLines(array $lines): array
    {
        return array_map(function ($l) {
            return [
                'product_id' => $l['product_id'] ?? null,
                'product_name' => $l['product_name'] ?? $l['description'] ?? null,
                'description' => $l['description'] ?? null,
                'qty' => $l['qty'] ?? 1,
                'unit_price' => $l['unit_price'] ?? 0,
                'discount_type' => $l['discount_type'] ?? null,
                'discount_percent' => $l['discount_percent'] ?? null,
                'discount_amount' => $l['discount_amount'] ?? 0,
                'tax_rate_id' => $l['tax_rate_id'] ?? null,
                'tax_amount' => $l['tax_amount'] ?? 0,
                'line_total' => $l['line_total'] ?? round(($l['qty'] ?? 1) * ($l['unit_price'] ?? 0), 2),
            ];
        }, $lines);
    }

    private function uniqueDocNo(string $prefix): string
    {
        return $prefix . '-' . strtoupper(Str::random(10));
    }

    private function createPurchaseBill(array $payload): array
    {
        $bill = PurchaseBill::create($this->baseDraftFields($payload) + [
            'bill_no' => $this->uniqueDocNo('DOC-PB'),
            'bill_date' => $payload['bill_date'] ?? now()->toDateString(),
            'due_date' => $payload['due_date'] ?? null,
            'warehouse_id' => $payload['warehouse_id'] ?? null,
        ]);
        foreach ($this->mapLines($payload['lines'] ?? []) as $line) {
            PurchaseBillLine::create(['purchase_bill_id' => $bill->id] + $line);
        }
        return ['record_id' => $bill->id, 'record_type' => PurchaseBill::class, 'open_url' => "/payment-out/purchase-bills/{$bill->id}"];
    }

    private function createInvoice(array $payload): array
    {
        $invoice = Invoice::create($this->baseDraftFields($payload) + [
            'invoice_no' => $this->uniqueDocNo('DOC-INV'),
            'invoice_date' => $payload['invoice_date'] ?? now()->toDateString(),
            'due_date' => $payload['due_date'] ?? null,
            'warehouse_id' => $payload['warehouse_id'] ?? null,
        ]);
        foreach ($this->mapLines($payload['lines'] ?? []) as $line) {
            InvoiceLine::create(['invoice_id' => $invoice->id] + $line);
        }
        return ['record_id' => $invoice->id, 'record_type' => Invoice::class, 'open_url' => "/payment-in/invoices/{$invoice->id}"];
    }

    private function createExpense(array $payload): array
    {
        $expense = Expense::create($this->baseDraftFields($payload) + [
            'expense_no' => $this->uniqueDocNo('DOC-EXP'),
            'expense_date' => $payload['expense_date'] ?? now()->toDateString(),
            'due_date' => $payload['due_date'] ?? null,
        ]);
        foreach (($payload['lines'] ?? []) as $line) {
            $accountId = $line['account_id'] ?? $line['chart_of_account_id'] ?? null;
            if (!$accountId) continue; // expense lines require an account; user picks it during review
            ExpenseLine::create([
                'expense_id' => $expense->id,
                'chart_of_account_id' => $accountId,
                'description' => $line['description'] ?? $line['product_name'] ?? null,
                'tax_rate_id' => $line['tax_rate_id'] ?? null,
                'amount' => $line['line_total'] ?? round(($line['qty'] ?? 1) * ($line['unit_price'] ?? 0), 2),
                'tax_amount' => $line['tax_amount'] ?? 0,
                'line_total' => $line['line_total'] ?? round(($line['qty'] ?? 1) * ($line['unit_price'] ?? 0), 2),
            ]);
        }
        return ['record_id' => $expense->id, 'record_type' => Expense::class, 'open_url' => "/payment-out/expenses/{$expense->id}"];
    }

    private function createCustomerPayment(array $payload): array
    {
        $cp = CustomerPayment::create([
            'branch_id' => $payload['branch_id'] ?? auth()->user()?->branch_id ?? null,
            'payment_no' => $this->uniqueDocNo('DOC-CP'),
            'payment_date' => $payload['payment_date'] ?? now()->toDateString(),
            'contact_id' => $payload['contact_id'] ?? null,
            'account_id' => $payload['account_id'] ?? null,
            'currency_id' => $payload['currency_id'] ?? null,
            'amount' => $payload['amount'] ?? 0,
            'payment_method' => $payload['payment_method'] ?? $payload['method'] ?? null,
            'reference' => $payload['reference'] ?? null,
            'notes' => $payload['notes'] ?? null,
            'status' => 'draft',
            'active' => true,
            'approved' => false,
            'void' => false,
            'exchange_rate' => 1,
            'user_add_id' => auth()->id(),
        ]);
        return ['record_id' => $cp->id, 'record_type' => CustomerPayment::class, 'open_url' => "/payment-in/customer-payments/{$cp->id}"];
    }

    private function createSupplierPayment(array $payload): array
    {
        $sp = SupplierPayment::create([
            'branch_id' => $payload['branch_id'] ?? auth()->user()?->branch_id ?? null,
            'payment_no' => $this->uniqueDocNo('DOC-SP'),
            'payment_date' => $payload['payment_date'] ?? now()->toDateString(),
            'contact_id' => $payload['contact_id'] ?? null,
            'account_id' => $payload['account_id'] ?? null,
            'currency_id' => $payload['currency_id'] ?? null,
            'amount' => $payload['amount'] ?? 0,
            'method' => $payload['method'] ?? $payload['payment_method'] ?? null,
            'reference' => $payload['reference'] ?? null,
            'notes' => $payload['notes'] ?? null,
            'status' => 'draft',
            'active' => true,
            'approved' => false,
            'void' => false,
            'user_add_id' => auth()->id(),
        ]);
        return ['record_id' => $sp->id, 'record_type' => SupplierPayment::class, 'open_url' => "/payment-out/supplier-payments/{$sp->id}"];
    }

    private function createCreditNote(array $payload): array
    {
        // KiteLedger uses SalesReturn for credit-note style transactions.
        $sr = SalesReturn::create($this->baseDraftFields($payload) + [
            'sales_return_no' => $this->uniqueDocNo('DOC-CN'),
            'sales_return_date' => $payload['sales_return_date'] ?? now()->toDateString(),
            'warehouse_id' => $payload['warehouse_id'] ?? null,
        ]);
        foreach ($this->mapLines($payload['lines'] ?? []) as $line) {
            SalesReturnLine::create(['sales_return_id' => $sr->id] + $line);
        }
        return ['record_id' => $sr->id, 'record_type' => SalesReturn::class, 'open_url' => "/payment-in/sales-returns/{$sr->id}"];
    }

    private function createDebitNote(array $payload): array
    {
        $dn = DebitNote::create($this->baseDraftFields($payload) + [
            'debit_note_no' => $this->uniqueDocNo('DOC-DN'),
            'debit_note_date' => $payload['debit_note_date'] ?? now()->toDateString(),
            'warehouse_id' => $payload['warehouse_id'] ?? null,
        ]);
        foreach ($this->mapLines($payload['lines'] ?? []) as $line) {
            DebitNoteLine::create(['debit_note_id' => $dn->id] + $line);
        }
        return ['record_id' => $dn->id, 'record_type' => DebitNote::class, 'open_url' => "/payment-out/debit-notes/{$dn->id}"];
    }

    private function createPurchaseOrder(array $payload): array
    {
        $po = PurchaseOrder::create($this->baseDraftFields($payload) + [
            'purchase_order_no' => $this->uniqueDocNo('DOC-PO'),
            'purchase_order_date' => $payload['purchase_order_date'] ?? now()->toDateString(),
        ]);
        foreach ($this->mapLines($payload['lines'] ?? []) as $line) {
            PurchaseOrderLine::create(['purchase_order_id' => $po->id] + $line);
        }
        return ['record_id' => $po->id, 'record_type' => PurchaseOrder::class, 'open_url' => "/payment-out/purchase-orders/{$po->id}"];
    }

    private function createSalesOrder(array $payload): array
    {
        $so = SalesOrder::create($this->baseDraftFields($payload) + [
            'sales_order_no' => $this->uniqueDocNo('DOC-SO'),
            'sales_order_date' => $payload['sales_order_date'] ?? now()->toDateString(),
            'warehouse_id' => $payload['warehouse_id'] ?? null,
            'grand_total' => $payload['grand_total'] ?? $payload['total'] ?? 0,
        ]);
        foreach ($this->mapLines($payload['lines'] ?? []) as $line) {
            SalesOrderLine::create(['sales_order_id' => $so->id] + $line);
        }
        return ['record_id' => $so->id, 'record_type' => SalesOrder::class, 'open_url' => "/payment-in/sales-orders/{$so->id}"];
    }

    private function createQuotation(array $payload): array
    {
        $q = Quotation::create($this->baseDraftFields($payload) + [
            'quotation_no' => $this->uniqueDocNo('DOC-QT'),
            'quotation_date' => $payload['quotation_date'] ?? now()->toDateString(),
            'expiry_date' => $payload['expiry_date'] ?? null,
            'terms_and_conditions' => $payload['terms_and_conditions'] ?? null,
        ]);
        foreach ($this->mapLines($payload['lines'] ?? []) as $line) {
            QuotationLine::create(['quotation_id' => $q->id] + $line);
        }
        return ['record_id' => $q->id, 'record_type' => Quotation::class, 'open_url' => "/payment-in/quotations/{$q->id}"];
    }
}
