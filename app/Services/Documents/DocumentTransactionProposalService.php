<?php

namespace App\Services\Documents;

use App\Models\Contact;
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
        $contactId = $matches['contact'] ?? $this->resolveContactId($doc, $transactionType, $normalized);
        $currencyId = $matches['currency'] ?? null;
        $warehouseId = $matches['warehouse_default'] ?? null;

        $lines = [];
        foreach (($normalized['lines'] ?? []) as $idx => $line) {
            $lineKey = 'product_' . $idx;
            $lines[] = [
                'product_id' => $matches[$lineKey] ?? null,
                'product_name' => $line['product_name'] ?? $line['description'] ?? null,
                'description' => $line['description'] ?? $line['product_name'] ?? null,
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
        $party = $normalized['party'] ?? [];

        $common = [
            'contact_id' => $contactId,
            'currency_id' => $currencyId,
            'reference' => $normalized['document_number'] ?? null,
            'notes' => null,
            'exchange_rate' => 1,
            'total' => $grand,
            'lines' => $lines,
            'extracted_party' => [
                'role' => $party['role'] ?? null,
                'name' => $party['name'] ?? null,
                'tax_number' => $party['tax_number'] ?? null,
                'email' => $party['email'] ?? null,
                'phone' => $party['phone'] ?? null,
                'address' => $party['address'] ?? null,
            ],
        ];

        return match ($transactionType) {
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
                'extracted_party' => $common['extracted_party'],
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

    public function refreshProposalMatches(DocumentTransactionProposal $proposal): DocumentTransactionProposal
    {
        $payload = $proposal->payload ?? [];
        $matches = $this->matchMap($proposal->documentUpload);

        if (!empty($matches['contact']) && empty($payload['contact_id'])) {
            $payload['contact_id'] = $matches['contact'];
        }
        if (!empty($matches['currency']) && empty($payload['currency_id'])) {
            $payload['currency_id'] = $matches['currency'];
        }
        if (!empty($matches['bank_account']) && empty($payload['account_id'])) {
            $payload['account_id'] = $matches['bank_account'];
        }
        if (!empty($matches['warehouse_default']) && empty($payload['warehouse_id'])) {
            $payload['warehouse_id'] = $matches['warehouse_default'];
        }

        foreach (($payload['lines'] ?? []) as $idx => $line) {
            $key = 'product_' . $idx;
            if (!empty($matches[$key]) && empty($payload['lines'][$idx]['product_id'])) {
                $payload['lines'][$idx]['product_id'] = $matches[$key];
            }
        }

        return $this->update($proposal, $payload, $proposal->warnings ?? []);
    }

    private function matchMap(DocumentUpload $doc): array
    {
        $matches = DocumentEntityMatch::query()
            ->where('document_upload_id', $doc->id)
            ->whereIn('match_status', ['matched', 'created'])
            ->whereNotNull('matched_id')
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

    private function resolveContactId(DocumentUpload $doc, string $transactionType, array $normalized): ?string
    {
        $party = $normalized['party'] ?? [];
        $name = trim((string) ($party['name'] ?? ''));
        if ($name === '') {
            return null;
        }

        $entityType = $this->contactEntityType($transactionType, strtolower((string) ($party['role'] ?? '')));
        $existing = $this->findExistingContact($name, $party);
        if ($existing) {
            $this->upsertContactMatch($doc, $entityType, $name, $existing, 'matched', 0.95, $party);
            return $existing->id;
        }

        $contact = Contact::create([
            'name' => $name,
            'contact_type' => $entityType === 'supplier' ? 'Supplier' : 'Customer',
            'email' => $party['email'] ?? null,
            'phone' => $party['phone'] ?? null,
            'address' => $party['address'] ?? null,
            'tax_registration_no' => $party['tax_number'] ?? null,
            'accept_purchase' => $entityType === 'supplier',
            'active' => true,
            'is_system_generated' => true,
            'user_add_id' => auth()->id(),
        ]);

        $this->upsertContactMatch($doc, $entityType, $name, $contact, 'created', 0.90, $party);
        return $contact->id;
    }

    private function contactEntityType(string $transactionType, string $partyRole): string
    {
        if (in_array($transactionType, ['purchase_bill', 'purchase_order', 'supplier_payment', 'debit_note'], true)) {
            return 'supplier';
        }
        if (in_array($transactionType, ['invoice', 'sales_order', 'quotation', 'customer_payment', 'credit_note'], true)) {
            return 'customer';
        }
        return in_array($partyRole, ['supplier', 'vendor'], true) ? 'supplier' : 'customer';
    }

    private function findExistingContact(string $name, array $party): ?Contact
    {
        if (!empty($party['tax_number'])) {
            $contact = Contact::query()->where('tax_registration_no', $party['tax_number'])->first();
            if ($contact) return $contact;
        }

        if (!empty($party['email'])) {
            $contact = Contact::query()->whereRaw('LOWER(email) = ?', [strtolower($party['email'])])->first();
            if ($contact) return $contact;
        }

        return Contact::query()->whereRaw('LOWER(name) = ?', [strtolower($name)])->first();
    }

    private function upsertContactMatch(DocumentUpload $doc, string $entityType, string $name, Contact $contact, string $status, float $confidence, array $party): void
    {
        DocumentEntityMatch::updateOrCreate([
            'document_upload_id' => $doc->id,
            'entity_type' => $entityType,
            'extracted_name' => $name,
        ], [
            'matched_model' => Contact::class,
            'matched_id' => $contact->id,
            'match_status' => $status,
            'confidence_score' => $confidence,
            'created_record_id' => $status === 'created' ? $contact->id : null,
            'options' => [
                'suggestions' => [],
                'extra' => [
                    'source' => 'document_extraction',
                    'party' => $party,
                ],
            ],
        ]);
    }
}
