<?php

namespace App\Services;

use App\Models\DocumentNumbering;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class DocumentNumberingService
{
    protected array $modelMapping = [
        'Invoice' => ['document_type' => 'invoice', 'field' => 'invoice_no', 'approval_required' => true, 'accounting_impact' => true],
        'CustomerPayment' => ['document_type' => 'receipt', 'field' => 'payment_no', 'approval_required' => true, 'accounting_impact' => true],
        'SupplierPayment' => ['document_type' => 'payment', 'field' => 'payment_no', 'approval_required' => true, 'accounting_impact' => true],
        'PurchaseBill' => ['document_type' => 'purchase_bill', 'field' => 'bill_no', 'approval_required' => true, 'accounting_impact' => true],
        'Expense' => ['document_type' => 'expense', 'field' => 'expense_no', 'approval_required' => true, 'accounting_impact' => true],
        'CashTransfer' => ['document_type' => 'cash_transfer', 'field' => 'transfer_no', 'approval_required' => true, 'accounting_impact' => true],
        'JournalVoucher' => ['document_type' => 'journal_voucher', 'field' => 'voucher_no', 'approval_required' => true, 'accounting_impact' => true],
        'SalesReturn' => ['document_type' => 'sales_return', 'field' => 'sales_return_no', 'approval_required' => true, 'accounting_impact' => true],
        'DebitNote' => ['document_type' => 'debit_note', 'field' => 'debit_note_no', 'approval_required' => true, 'accounting_impact' => true],
        'WarehouseTransfer' => ['document_type' => 'warehouse_transfer', 'field' => 'transfer_no', 'approval_required' => true, 'accounting_impact' => false],
        'InventoryAdjustment' => ['document_type' => 'inventory_adjustment', 'field' => 'adjustment_no', 'approval_required' => true, 'accounting_impact' => true],
        'Quotation' => ['document_type' => 'quotation', 'field' => 'quotation_no', 'approval_required' => true, 'accounting_impact' => false],
        'SalesOrder' => ['document_type' => 'sales_order', 'field' => 'sales_order_no', 'approval_required' => true, 'accounting_impact' => false],
        'PurchaseOrder' => ['document_type' => 'purchase_order', 'field' => 'purchase_order_no', 'approval_required' => true, 'accounting_impact' => false],
        'ProformaInvoice' => ['document_type' => 'proforma_invoice', 'field' => 'proforma_no', 'approval_required' => true, 'accounting_impact' => false],
        'LoanTopUp' => ['document_type' => 'loan_topup', 'field' => 'topup_no', 'approval_required' => true, 'accounting_impact' => true],
        'LoanCharge' => ['document_type' => 'loan_charge', 'field' => 'charge_no', 'approval_required' => true, 'accounting_impact' => true],
        'Contact' => ['document_type' => 'contact', 'field' => 'code', 'approval_required' => false, 'accounting_impact' => false],
        'Product' => ['document_type' => 'product', 'field' => 'code', 'approval_required' => false, 'accounting_impact' => false],
        'Lead' => ['document_type' => 'lead', 'field' => 'lead_no', 'approval_required' => false, 'accounting_impact' => false],
        'Deal' => ['document_type' => 'deal', 'field' => 'deal_no', 'approval_required' => false, 'accounting_impact' => false],
        'BankAccount' => ['document_type' => 'bank_account', 'field' => 'code', 'approval_required' => false, 'accounting_impact' => false],
        'LoanAccount' => ['document_type' => 'loan_account', 'field' => 'loan_number', 'approval_required' => false, 'accounting_impact' => false],
    ];

    public function generate(string $documentType, bool $force = false): ?string
    {
        $numbering = DocumentNumbering::query()
            ->where('document_type', $documentType)
            ->where('active', true)
            ->lockForUpdate()
            ->first();

        if (!$numbering) {
            throw new InvalidArgumentException("No active numbering configuration found for document type: {$documentType}");
        }

        if ($numbering->type_of_account === 'manual_numbering' && !$force) {
            throw new InvalidArgumentException("Document type '{$documentType}' uses manual numbering.");
        }

        $number = $numbering->next_number;
        $prefix = $numbering->prefix ?? strtoupper($documentType);

        $code = $this->formatCode($prefix, $number);

        $numbering->increment('next_number');

        return $code;
    }

    public function generateForApprovedModel(Model $model): ?string
    {
        $modelClass = class_basename($model);
        $mapping = $this->modelMapping[$modelClass] ?? null;

        if (!$mapping) {
            return null;
        }

        if (!$mapping['approval_required']) {
            return null;
        }

        $field = $mapping['field'];
        if ($model->{$field} !== null) {
            return null;
        }

        return $this->generate($mapping['document_type']);
    }

    public function getMappingForModel(Model $model): ?array
    {
        $modelClass = class_basename($model);
        return $this->modelMapping[$modelClass] ?? null;
    }

    public function assignNumberIfMissing(Model $model): Model
    {
        $modelClass = class_basename($model);
        $mapping = $this->modelMapping[$modelClass] ?? null;

        if (!$mapping) {
            return $model;
        }

        $field = $mapping['field'];

        if ($model->{$field} === null) {
            $number = $this->generate($mapping['document_type']);
            if ($number) {
                $model->{$field} = $number;
            }
        }

        return $model;
    }

    protected function formatCode(string $prefix, int $number, int $pad = 6): string
    {
        return $prefix . '-' . str_pad((string) $number, $pad, '0', STR_PAD_LEFT);
    }
}
