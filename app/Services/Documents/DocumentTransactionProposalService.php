<?php

namespace App\Services\Documents;

use App\Models\DocumentEntityMatch;
use App\Models\DocumentTransactionProposal;
use App\Models\DocumentUpload;

class DocumentTransactionProposalService
{
    public const SUPPORTED_TYPES = [
        'customer_payment', 'invoice', 'expense', 'supplier_payment',
        'purchase_bill', 'credit_note', 'debit_note',
        'purchase_order', 'sales_order', 'quotation',
    ];

    public function buildPayload(DocumentUpload $doc, string $transactionType, array $normalized): array
    {
        $matches = $this->matchMap($doc);
        $contactId = $matches['contact'] ?? null;
        $currencyId = $matches['currency'] ?? null;
        $warehouseId = $matches['warehouse_default'] ?? null;

        $lines = [];
        foreach (($normalized['lines'] ?? []) as $idx => $line) {
            $lineKey = 'product_' . $idx;
            $lines[] = [
                'product_id' => $matches[$lineKey] ?? null,
                'product_name' => $line['product_name'] ?? $line['description'] ?? null,
                'description' => $line['description'],
                'qty' => $line['quantity'] ?? 1,
                'unit_price' => $line['rate'] ?? 0,
                'discount_type' => null,
                'discount_amount' => $line['discount'] ?? 0,
                'tax_rate_id' => null,
                'tax_amount' => $line['tax_amount'] ?? 0,
                'line_total' => $line['amount'] ?? 0,
            ];
        }

        $totals = $normalized['totals'] ?? [];
        $grand = $totals['grand_total'] ?? null;

        $common = [
            'contact_id' => $contactId,
            'currency_id' => $currencyId,
            'reference' => $normalized['document_number'] ?? null,
            'notes' => null,
            'exchange_rate' => 1,
            'total' => $grand,
            'lines' => $lines,
        ];

        $payload = match ($transactionType) {
            'purchase_bill' => $common + [
                'bill_date' => $normalized['document_date'] ?? null,
                'due_date' => $normalized['due_date'] ?? null,
                'warehouse_id' => $warehouseId,
            ],
            'invoice' => $common + [
                'invoice_date' => $normalized['document_date'] ?? null,
                'due_date' => $normalized['due_date'] ?? null,
                'warehouse_id' => $warehouseId,
            ],
            'expense' => $common + [
                'expense_date' => $normalized['document_date'] ?? null,
                'due_date' => $normalized['due_date'] ?? null,
            ],
            'customer_payment', 'supplier_payment' => [
                'contact_id' => $contactId,
                'currency_id' => $currencyId,
                'payment_date' => $normalized['payment']['payment_date'] ?? $normalized['document_date'] ?? null,
                'amount' => $normalized['payment']['paid_amount'] ?? $grand,
                'account_id' => $matches['bank_account'] ?? null,
                'method' => $normalized['payment']['method'] ?? null,
                'payment_method' => $normalized['payment']['method'] ?? null,
                'reference' => $normalized['payment']['reference_no'] ?? $normalized['document_number'] ?? null,
                'exchange_rate' => 1,
            ],
            'credit_note' => $common + [
                'sales_return_date' => $normalized['document_date'] ?? null,
                'warehouse_id' => $warehouseId,
            ],
            'debit_note' => $common + [
                'debit_note_date' => $normalized['document_date'] ?? null,
                'warehouse_id' => $warehouseId,
            ],
            'purchase_order' => $common + [
                'purchase_order_date' => $normalized['document_date'] ?? null,
            ],
            'sales_order' => $common + [
                'sales_order_date' => $normalized['document_date'] ?? null,
                'warehouse_id' => $warehouseId,
                'grand_total' => $grand,
            ],
            'quotation' => $common + [
                'quotation_date' => $normalized['document_date'] ?? null,
                'expiry_date' => $normalized['due_date'] ?? null,
                'terms_and_conditions' => $normalized['terms_and_conditions'] ?? null,
            ],
            default => $common,
        };

        return $payload;
    }

    public function detectMissingFields(string $type, array $payload): array
    {
        $missing = [];
        $requireContact = !in_array($type, ['expense'], true);
        if ($requireContact && empty($payload['contact_id'])) $missing[] = 'contact_id';

        $dateMap = [
            'purchase_bill' => 'bill_date',
            'invoice' => 'invoice_date',
            'expense' => 'expense_date',
            'customer_payment' => 'payment_date',
            'supplier_payment' => 'payment_date',
            'credit_note' => 'sales_return_date',
            'debit_note' => 'debit_note_date',
            'purchase_order' => 'purchase_order_date',
            'sales_order' => 'sales_order_date',
            'quotation' => 'quotation_date',
        ];
        $dateField = $dateMap[$type] ?? null;
        if ($dateField && empty($payload[$dateField])) $missing[] = $dateField;

        if (in_array($type, ['customer_payment', 'supplier_payment'], true)) {
            if (empty($payload['amount'])) $missing[] = 'amount';
        } else {
            if (empty($payload['lines'])) $missing[] = 'lines';
            if (empty($payload['total'])) $missing[] = 'total';
        }

        return $missing;
    }

    public function create(DocumentUpload $doc, string $transactionType, array $payload, array $warnings = [], ?string $extractionId = null): DocumentTransactionProposal
    {
        $missing = $this->detectMissingFields($transactionType, $payload);
        $status = $missing ? 'needs_review' : 'ready';

        return DocumentTransactionProposal::create([
            'document_upload_id' => $doc->id,
            'document_extraction_id' => $extractionId,
            'transaction_type' => $transactionType,
            'status' => $status,
            'payload' => $payload,
            'missing_fields' => $missing,
            'warnings' => $warnings,
            'confidence_score' => null,
            'created_by' => auth()->id(),
        ]);
    }

    public function update(DocumentTransactionProposal $proposal, array $payload, array $warnings = []): DocumentTransactionProposal
    {
        $missing = $this->detectMissingFields($proposal->transaction_type, $payload);
        $proposal->update([
            'payload' => $payload,
            'missing_fields' => $missing,
            'warnings' => $warnings,
            'status' => $missing ? 'needs_review' : 'ready',
        ]);
        return $proposal->refresh();
    }

    private function matchMap(DocumentUpload $doc): array
    {
        $matches = DocumentEntityMatch::query()
            ->where('document_upload_id', $doc->id)
            ->where('match_status', 'matched')
            ->get();

        $map = [];
        $productIdx = 0;
        foreach ($matches as $m) {
            switch ($m->entity_type) {
                case 'customer':
                case 'supplier':
                    $map['contact'] = $m->matched_id; break;
                case 'currency':
                    $map['currency'] = $m->matched_id; break;
                case 'warehouse':
                    $role = $m->options['extra']['role'] ?? 'warehouse_default';
                    $map[$role === 'source_warehouse' ? 'warehouse_source' : ($role === 'destination_warehouse' ? 'warehouse_destination' : 'warehouse_default')] = $m->matched_id;
                    break;
                case 'bank_account':
                    $map['bank_account'] = $m->matched_id; break;
                case 'product':
                    $idx = $m->options['extra']['line_index'] ?? $productIdx;
                    $map['product_' . $idx] = $m->matched_id;
                    $productIdx++;
                    break;
            }
        }
        return $map;
    }
}
