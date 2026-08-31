<?php

declare(strict_types=1);

namespace App\Services\Documents\Schema;

/**
 * Per-document-type field rules.
 *
 * Replaces the single broad schema that treated a bank statement and a purchase
 * bill as the same shape. Required fields differ sharply by type — a payment
 * slip has no line items, a journal voucher has no party — so validating them
 * against one list produced misleading "missing field" noise.
 */
final class DocumentSchemaRegistry
{
    /**
     * type => [label, required, optional, conversion_target, sections, needs_lines]
     */
    private const SCHEMAS = [
        'purchase_bill' => [
            'label' => 'Purchase bill',
            'required' => ['party.name', 'document_number', 'document_date', 'totals.grand_total'],
            'optional' => ['due_date', 'currency_code', 'party.tax_number', 'totals.tax_total', 'payment_terms'],
            'conversion_target' => 'purchase_bill',
            'party_role' => 'supplier',
            'needs_lines' => true,
        ],
        'sales_invoice' => [
            'label' => 'Sales invoice',
            'required' => ['party.name', 'document_number', 'document_date', 'totals.grand_total'],
            'optional' => ['due_date', 'currency_code', 'party.tax_number', 'totals.tax_total'],
            'conversion_target' => 'invoice',
            'party_role' => 'customer',
            'needs_lines' => true,
        ],
        'expense_receipt' => [
            'label' => 'Expense receipt',
            'required' => ['document_date', 'totals.grand_total'],
            'optional' => ['party.name', 'document_number', 'currency_code', 'totals.tax_total'],
            'conversion_target' => 'expense',
            'party_role' => 'supplier',
            'needs_lines' => false,
        ],
        'quotation' => [
            'label' => 'Quotation',
            'required' => ['party.name', 'document_date', 'totals.grand_total'],
            'optional' => ['document_number', 'currency_code', 'due_date'],
            'conversion_target' => 'quotation',
            'party_role' => 'customer',
            'needs_lines' => true,
        ],
        'sales_order' => [
            'label' => 'Sales order',
            'required' => ['party.name', 'document_date', 'totals.grand_total'],
            'optional' => ['document_number', 'currency_code'],
            'conversion_target' => 'sales_order',
            'party_role' => 'customer',
            'needs_lines' => true,
        ],
        'purchase_order' => [
            'label' => 'Purchase order',
            'required' => ['party.name', 'document_date', 'totals.grand_total'],
            'optional' => ['document_number', 'currency_code'],
            'conversion_target' => 'purchase_order',
            'party_role' => 'supplier',
            'needs_lines' => true,
        ],
        'credit_note' => [
            'label' => 'Credit note',
            'required' => ['party.name', 'document_date', 'totals.grand_total'],
            'optional' => ['document_number', 'currency_code'],
            'conversion_target' => 'credit_note',
            'party_role' => 'customer',
            'needs_lines' => true,
        ],
        'debit_note' => [
            'label' => 'Debit note',
            'required' => ['party.name', 'document_date', 'totals.grand_total'],
            'optional' => ['document_number', 'currency_code'],
            'conversion_target' => 'debit_note',
            'party_role' => 'supplier',
            'needs_lines' => true,
        ],
        'customer_payment_slip' => [
            'label' => 'Customer payment',
            'required' => ['party.name', 'document_date', 'totals.paid_amount'],
            'optional' => ['document_number', 'currency_code'],
            'conversion_target' => 'customer_payment',
            'party_role' => 'customer',
            'needs_lines' => false,
        ],
        'supplier_payment_slip' => [
            'label' => 'Supplier payment',
            'required' => ['party.name', 'document_date', 'totals.paid_amount'],
            'optional' => ['document_number', 'currency_code'],
            'conversion_target' => 'supplier_payment',
            'party_role' => 'supplier',
            'needs_lines' => false,
        ],
        'journal_voucher' => [
            'label' => 'Journal voucher',
            'required' => ['document_date'],
            'optional' => ['document_number', 'currency_code'],
            // Extraction is supported; conversion is intentionally not, because
            // a JV needs explicit account selection that cannot be inferred safely.
            'conversion_target' => null,
            'party_role' => null,
            'needs_lines' => false,
        ],
        'bank_statement' => [
            'label' => 'Bank statement',
            'required' => ['document_date'],
            'optional' => ['currency_code'],
            'conversion_target' => null,
            'party_role' => null,
            'needs_lines' => false,
        ],
        'warehouse_transfer' => [
            'label' => 'Warehouse transfer',
            'required' => ['document_date'],
            'optional' => ['document_number'],
            'conversion_target' => null,
            'party_role' => null,
            'needs_lines' => true,
        ],
        'inventory_adjustment' => [
            'label' => 'Inventory adjustment',
            'required' => ['document_date'],
            'optional' => ['document_number'],
            'conversion_target' => null,
            'party_role' => null,
            'needs_lines' => true,
        ],
        'other' => [
            'label' => 'Other document',
            'required' => [],
            'optional' => ['document_date', 'document_number'],
            'conversion_target' => null,
            'party_role' => null,
            'needs_lines' => false,
        ],
        'unknown' => [
            'label' => 'Unrecognised document',
            'required' => [],
            'optional' => [],
            'conversion_target' => null,
            'party_role' => null,
            'needs_lines' => false,
        ],
    ];

    public function has(string $type): bool
    {
        return isset(self::SCHEMAS[$type]);
    }

    public function get(string $type): DocumentSchema
    {
        $config = self::SCHEMAS[$type] ?? self::SCHEMAS['unknown'];

        return new DocumentSchema(
            type: $this->has($type) ? $type : 'unknown',
            label: $config['label'],
            requiredFields: $config['required'],
            optionalFields: $config['optional'],
            conversionTarget: $config['conversion_target'],
            partyRole: $config['party_role'],
            needsLines: $config['needs_lines'],
        );
    }

    /** @return string[] */
    public function extractableTypes(): array
    {
        return array_values(array_diff(array_keys(self::SCHEMAS), ['unknown']));
    }

    /** Types that can become an ERP draft. @return string[] */
    public function convertibleTypes(): array
    {
        return array_keys(array_filter(
            self::SCHEMAS,
            static fn (array $c) => $c['conversion_target'] !== null,
        ));
    }
}
