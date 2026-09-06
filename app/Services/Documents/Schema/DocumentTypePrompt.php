<?php

declare(strict_types=1);

namespace App\Services\Documents\Schema;

/**
 * Builds a per-document-type extraction schema.
 *
 * One universal schema asks every document for warehouse movements, journal
 * lines, payment details and line items regardless of what it is. A payment
 * slip has no line items and a journal voucher has no party, so the model
 * spends effort deciding that most of the schema is inapplicable — and
 * sometimes fills a section in rather than leaving it null, because the schema
 * implied it should exist.
 *
 * Narrowing the schema to the type's own fields shortens the prompt, removes
 * those invitations, and makes the required-field rules the reviewer sees match
 * the shape that was actually requested.
 */
final class DocumentTypePrompt
{
    /**
     * Sections each document type genuinely has.
     *
     * @var array<string, string[]>
     */
    private const SECTIONS = [
        'purchase_bill' => ['party', 'lines', 'totals', 'payment'],
        'sales_invoice' => ['party', 'lines', 'totals', 'payment'],
        'purchase_order' => ['party', 'lines', 'totals'],
        'sales_order' => ['party', 'lines', 'totals'],
        'quotation' => ['party', 'lines', 'totals'],
        'credit_note' => ['party', 'lines', 'totals'],
        'debit_note' => ['party', 'lines', 'totals'],
        'expense_receipt' => ['party', 'lines', 'totals', 'payment'],
        'customer_payment_slip' => ['party', 'totals', 'payment'],
        'supplier_payment_slip' => ['party', 'totals', 'payment'],
        'journal_voucher' => ['journal_entry'],
        'bank_statement' => ['transactions'],
        'warehouse_transfer' => ['lines', 'inventory'],
        'inventory_adjustment' => ['lines', 'inventory'],
    ];

    public function __construct(
        private readonly DocumentSchemaRegistry $registry,
    ) {}

    public function supports(string $type): bool
    {
        return isset(self::SECTIONS[$type]);
    }

    /**
     * The user-side prompt for a known document type.
     *
     * Falls back to the generic schema for a type with no narrowed definition,
     * so a new type added to the registry degrades to today's behaviour rather
     * than losing sections.
     */
    public function build(string $type): string
    {
        if (! $this->supports($type)) {
            return \App\Services\Documents\DocumentExtractionPrompt::user();
        }

        $schema = $this->registry->get($type);
        $sections = self::SECTIONS[$type];

        $shape = [
            'document_type' => $type,
            'confidence' => 0.0,
            'document_number' => null,
            'document_date' => null,
            'currency_code' => null,
        ];

        if (in_array('party', $sections, true)) {
            $shape['party'] = [
                'role' => $schema->partyRole ?? 'other',
                'name' => null,
                'tax_number' => null,
                'email' => null,
                'phone' => null,
                'address' => null,
            ];
        }

        if (in_array('lines', $sections, true)) {
            $shape['lines'] = [[
                'description' => null,
                'product_code' => null,
                'quantity' => null,
                'unit' => null,
                'rate' => null,
                'discount' => null,
                'tax_rate' => null,
                'tax_amount' => null,
                'amount' => null,
            ]];
        }

        if (in_array('totals', $sections, true)) {
            $shape['totals'] = [
                'subtotal' => null,
                'discount_total' => null,
                'tax_total' => null,
                'shipping' => null,
                'grand_total' => null,
                'paid_amount' => null,
                'balance_due' => null,
            ];
        }

        if (in_array('payment', $sections, true)) {
            $shape['payment'] = [
                'method' => null,
                'bank_name' => null,
                'reference_no' => null,
                'paid_amount' => null,
                'payment_date' => null,
            ];
        }

        if (in_array('journal_entry', $sections, true)) {
            $shape['journal_entry'] = [
                'narration' => null,
                'lines' => [[
                    'account_name' => null,
                    'debit' => null,
                    'credit' => null,
                    'description' => null,
                ]],
            ];
        }

        if (in_array('transactions', $sections, true)) {
            $shape['transactions'] = [[
                'date' => null,
                'description' => null,
                'reference' => null,
                'debit' => null,
                'credit' => null,
                'balance' => null,
            ]];
        }

        if (in_array('inventory', $sections, true)) {
            $shape['inventory'] = [
                'source_warehouse' => null,
                'destination_warehouse' => null,
                'movement_type' => null,
            ];
        }

        if (in_array('due_date', $schema->allFields(), true)) {
            $shape['due_date'] = null;
        }

        $shape['field_confidence'] = ['document_number' => 0.0];
        $shape['evidence'] = ['document_number' => ['page' => 1, 'text' => null]];
        $shape['warnings'] = [];

        $required = $schema->requiredFields === []
            ? 'None are strictly required; extract whatever is present.'
            : implode(', ', $schema->requiredFields);

        $json = json_encode($shape, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        return <<<PROMPT
This document has been classified as: {$schema->label}.

Extract it into exactly this JSON shape:

{$json}

Fields that matter most for this document type: {$required}

Use null for anything not shown on the document. Use 0 ONLY where the document shows an explicit zero, a dash, or states nil/exempt.
Do not add keys that are not in the shape above.
"field_confidence" holds your certainty per field key, 0.0 to 1.0.
"evidence" holds, per field key, the page number the value appeared on and the text you read it from.

Return ONLY the JSON object, no preamble.
PROMPT;
    }
}
