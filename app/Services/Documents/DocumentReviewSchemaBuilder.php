<?php

namespace App\Services\Documents;

class DocumentReviewSchemaBuilder
{
    public function build(string $transactionType, array $payload, array $missingFields, array $context = []): array
    {
        $schema = [];
        $partyLabel = $this->partyLabel($transactionType);

        $fields = [
            'contact_id' => [
                'label' => $partyLabel,
                'type' => 'fk_select',
                'endpoint' => '/api/contacts',
                'required' => true,
                'create_allowed' => true,
                'create_label' => 'Create New ' . $partyLabel,
                'create_payload_source' => 'extracted_party',
                'placeholder' => 'Select or create ' . strtolower($partyLabel),
                'match_id' => $context['contact_match_id'] ?? null,
                'create_payload' => $payload['extracted_party'] ?? null,
            ],
            'currency_id' => [
                'label' => 'Currency',
                'type' => 'fk_select',
                'endpoint' => '/api/currencies',
                'required' => false,
                'placeholder' => 'Select currency',
            ],
            'warehouse_id' => [
                'label' => 'Warehouse',
                'type' => 'fk_select',
                'endpoint' => '/api/warehouses',
                'required' => false,
                'placeholder' => 'Select warehouse',
            ],
            'account_id' => [
                'label' => 'Payment Account',
                'type' => 'fk_select',
                'endpoint' => '/api/accounts',
                'required' => in_array($transactionType, ['customer_payment', 'supplier_payment'], true),
                'placeholder' => 'Select payment account',
            ],
            'bill_date' => ['label' => 'Bill Date', 'type' => 'date', 'required' => true],
            'invoice_date' => ['label' => 'Invoice Date', 'type' => 'date', 'required' => true],
            'expense_date' => ['label' => 'Expense Date', 'type' => 'date', 'required' => true],
            'payment_date' => ['label' => 'Payment Date', 'type' => 'date', 'required' => true],
            'sales_return_date' => ['label' => 'Credit Note Date', 'type' => 'date', 'required' => true],
            'debit_note_date' => ['label' => 'Debit Note Date', 'type' => 'date', 'required' => true],
            'purchase_order_date' => ['label' => 'Purchase Order Date', 'type' => 'date', 'required' => true],
            'sales_order_date' => ['label' => 'Sales Order Date', 'type' => 'date', 'required' => true],
            'quotation_date' => ['label' => 'Quotation Date', 'type' => 'date', 'required' => true],
            'expiry_date' => ['label' => 'Expiry Date', 'type' => 'date', 'required' => false],
            'due_date' => ['label' => 'Due Date', 'type' => 'date', 'required' => false],
            'reference' => ['label' => 'Reference', 'type' => 'text', 'required' => false],
            'amount' => ['label' => 'Amount', 'type' => 'money', 'required' => true],
            'total' => ['label' => 'Total', 'type' => 'money', 'required' => true],
            'terms_and_conditions' => ['label' => 'Terms and Conditions', 'type' => 'textarea', 'required' => false],
            'lines' => ['label' => 'Line Items', 'type' => 'line_items', 'required' => true],
        ];

        $visible = array_unique(array_merge($this->coreFields($transactionType), $missingFields));

        foreach ($visible as $field) {
            if (!isset($fields[$field])) {
                $fields[$field] = [
                    'field' => $field,
                    'label' => ucwords(str_replace('_', ' ', $field)),
                    'type' => 'text',
                    'required' => in_array($field, $missingFields, true),
                ];
            }

            $schema[] = ['field' => $field] + $fields[$field] + [
                'value' => $payload[$field] ?? null,
                'missing' => in_array($field, $missingFields, true),
            ];
        }

        if ($transactionType === 'expense') {
            $schema[] = [
                'field' => 'lines.account_id',
                'label' => 'Expense Account',
                'type' => 'line_fk_select',
                'endpoint' => '/api/accounts',
                'required' => true,
                'placeholder' => 'Select account for each expense line',
                'missing' => in_array('lines.account_id', $missingFields, true),
            ];
        }

        return $schema;
    }

    private function coreFields(string $type): array
    {
        return match ($type) {
            'purchase_bill' => ['contact_id', 'bill_date', 'due_date', 'currency_id', 'warehouse_id', 'reference', 'total', 'lines'],
            'invoice' => ['contact_id', 'invoice_date', 'due_date', 'currency_id', 'warehouse_id', 'reference', 'total', 'lines'],
            'expense' => ['expense_date', 'currency_id', 'reference', 'total', 'lines'],
            'customer_payment', 'supplier_payment' => ['contact_id', 'payment_date', 'account_id', 'currency_id', 'reference', 'amount'],
            'credit_note' => ['contact_id', 'sales_return_date', 'currency_id', 'warehouse_id', 'reference', 'total', 'lines'],
            'debit_note' => ['contact_id', 'debit_note_date', 'currency_id', 'warehouse_id', 'reference', 'total', 'lines'],
            'purchase_order' => ['contact_id', 'purchase_order_date', 'currency_id', 'reference', 'total', 'lines'],
            'sales_order' => ['contact_id', 'sales_order_date', 'currency_id', 'warehouse_id', 'reference', 'total', 'lines'],
            'quotation' => ['contact_id', 'quotation_date', 'expiry_date', 'currency_id', 'reference', 'total', 'terms_and_conditions', 'lines'],
            default => ['contact_id', 'reference', 'total', 'lines'],
        };
    }

    private function partyLabel(string $type): string
    {
        return in_array($type, ['purchase_bill', 'purchase_order', 'supplier_payment', 'debit_note'], true)
            ? 'Supplier'
            : 'Customer';
    }
}
