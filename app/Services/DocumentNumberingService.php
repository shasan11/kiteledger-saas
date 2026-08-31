<?php

namespace App\Services;

use App\Models\DocumentNumbering;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class DocumentNumberingService
{
    /**
     * Draft placeholder numbers must fit the smallest document-number column
     * (varchar(40) on MySQL) and stay unique on its unique index.
     *
     * The token is deliberately short and readable. It used to embed a raw
     * 32-character UUID, which leaked an internal identifier onto the screen and
     * onto anything printed from a draft. Six characters of unambiguous base32
     * give ~1.07 billion combinations, which is ample for a placeholder that
     * only lives until the document is approved.
     */
    private const DRAFT_MAX_LENGTH = 40;
    private const DRAFT_PREFIX = 'DRAFT-';
    private const DRAFT_TOKEN_LENGTH = 6;

    /** Crockford-style base32: no I, L, O or U, so nothing reads ambiguously. */
    private const DRAFT_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

    /** Legacy prefixes still present on documents drafted before the change. */
    private const LEGACY_DRAFT_MARKERS = ['#draft', 'draft-'];

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
        'BillOfMaterial' => ['document_type' => 'bill_of_material', 'field' => 'code', 'approval_required' => false, 'accounting_impact' => false],
        'ProductionOrder' => ['document_type' => 'production_order', 'field' => 'code', 'approval_required' => true, 'accounting_impact' => true],
        'ProductionJournal' => ['document_type' => 'production_journal', 'field' => 'code', 'approval_required' => true, 'accounting_impact' => true],
        'Quotation' => ['document_type' => 'quotation', 'field' => 'quotation_no', 'approval_required' => true, 'accounting_impact' => false],
        'SalesOrder' => ['document_type' => 'sales_order', 'field' => 'sales_order_no', 'approval_required' => true, 'accounting_impact' => false],
        'PurchaseOrder' => ['document_type' => 'purchase_order', 'field' => 'purchase_order_no', 'approval_required' => true, 'accounting_impact' => false],
        'ProformaInvoice' => ['document_type' => 'proforma_invoice', 'field' => 'proforma_no', 'approval_required' => true, 'accounting_impact' => false],
        'LoanTopUp' => ['document_type' => 'loan_topup', 'field' => 'topup_no', 'approval_required' => true, 'accounting_impact' => true],
        'LoanCharge' => ['document_type' => 'loan_charge', 'field' => 'charge_no', 'approval_required' => true, 'accounting_impact' => true],
        'PosTerminal' => ['document_type' => 'pos_terminal', 'field' => 'code', 'approval_required' => false, 'accounting_impact' => false],
        'PosShift' => ['document_type' => 'pos_shift', 'field' => 'shift_no', 'approval_required' => false, 'accounting_impact' => false],
        'PosSale' => ['document_type' => 'pos_sale', 'field' => 'sale_no', 'approval_required' => false, 'accounting_impact' => false],
        'PosCashMovement' => ['document_type' => 'pos_cash_movement', 'field' => 'movement_no', 'approval_required' => false, 'accounting_impact' => false],
        'PosReturn' => ['document_type' => 'pos_return', 'field' => 'return_no', 'approval_required' => false, 'accounting_impact' => false],
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
        if ($model->{$field} !== null && !$this->isDraftNumber((string) $model->{$field})) {
            return null;
        }

        return $this->generate($mapping['document_type']);
    }

    public function getMappingForModel(Model $model): ?array
    {
        $modelClass = class_basename($model);
        return $this->modelMapping[$modelClass] ?? null;
    }

    protected function isDraftNumber(string $number): bool
    {
        return $this->looksLikeDraft($number);
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

    public function generateDraft(Model|string $model, mixed $date = null): string
    {
        $modelClass = class_basename($model);
        $mapping = $this->modelMapping[$modelClass] ?? null;
        $documentType = $mapping['document_type'] ?? 'document';
        $head = self::DRAFT_PREFIX.$this->draftTypeAbbreviation((string) $documentType).'-';

        // Guaranteed to fit: the abbreviation is capped, so this never
        // approaches the varchar(40) limit the way the old UUID format did.
        return substr($head, 0, self::DRAFT_MAX_LENGTH - self::DRAFT_TOKEN_LENGTH).$this->draftToken();
    }

    /**
     * Is this a placeholder rather than a real, issued document number?
     *
     * Recognises the current DRAFT- form and the legacy "#draft-…" numbers still
     * sitting on documents created before the format changed.
     */
    public function looksLikeDraft(?string $number): bool
    {
        $normalized = strtolower(trim((string) $number));

        if ($normalized === '') {
            return true;
        }

        foreach (self::LEGACY_DRAFT_MARKERS as $marker) {
            if (str_starts_with($normalized, $marker)) {
                return true;
            }
        }

        return str_starts_with($normalized, strtolower(self::DRAFT_PREFIX));
    }

    /**
     * A compact, pronounceable stand-in for the document type: INVOICE stays
     * INVOICE, but PURCHASE-BILL becomes PB so the token never crowds the
     * column. Single-word types keep their name when it is already short.
     */
    protected function draftTypeAbbreviation(string $documentType): string
    {
        $words = array_values(array_filter(preg_split('/[^A-Za-z0-9]+/', $documentType) ?: []));

        if (! $words) {
            return 'DOC';
        }

        if (count($words) === 1) {
            return strtoupper(substr($words[0], 0, 12));
        }

        return strtoupper(implode('', array_map(fn (string $word): string => substr($word, 0, 1), $words)));
    }

    protected function draftToken(): string
    {
        $alphabet = self::DRAFT_ALPHABET;
        $token = '';

        for ($i = 0; $i < self::DRAFT_TOKEN_LENGTH; $i++) {
            $token .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        return $token;
    }
}
