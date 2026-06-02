<?php

namespace App\Services\Documents;

use App\Models\Account;
use App\Models\Contact;
use App\Models\Currency;
use App\Models\Product;
use App\Models\TaxRate;
use App\Models\Warehouse;

class DocumentTransactionPayloadValidator
{
    public function missingFields(string $type, array $payload): array
    {
        $missing = [];

        if (!in_array($type, ['expense'], true) && empty($payload['contact_id'])) {
            $missing[] = 'contact_id';
        }

        $dateField = $this->dateField($type);
        if ($dateField && empty($payload[$dateField])) {
            $missing[] = $dateField;
        }

        if (in_array($type, ['customer_payment', 'supplier_payment'], true)) {
            if (empty($payload['amount']) || (float) $payload['amount'] <= 0) {
                $missing[] = 'amount';
            }
            if (empty($payload['account_id'])) {
                $missing[] = 'account_id';
            }
        } else {
            if (empty($payload['lines']) || !is_array($payload['lines'])) {
                $missing[] = 'lines';
            }
            if (empty($payload['total']) || (float) $payload['total'] <= 0) {
                $missing[] = 'total';
            }
        }

        if ($type === 'expense') {
            foreach (($payload['lines'] ?? []) as $line) {
                if (empty($line['account_id']) && empty($line['chart_of_account_id'])) {
                    $missing[] = 'lines.account_id';
                    break;
                }
            }
        }

        return array_values(array_unique($missing));
    }

    public function validateForConversion(string $type, array $payload): array
    {
        $missing = $this->missingFields($type, $payload);
        $errors = [];

        if (!empty($payload['contact_id']) && !Contact::query()->whereKey($payload['contact_id'])->exists()) {
            $missing[] = 'contact_id';
            $errors[] = 'Selected contact could not be found.';
        }

        if (!empty($payload['currency_id']) && !Currency::query()->whereKey($payload['currency_id'])->exists()) {
            $missing[] = 'currency_id';
            $errors[] = 'Selected currency could not be found.';
        }

        if (!empty($payload['warehouse_id']) && !Warehouse::query()->whereKey($payload['warehouse_id'])->exists()) {
            $missing[] = 'warehouse_id';
            $errors[] = 'Selected warehouse could not be found.';
        }

        if (!empty($payload['account_id']) && !Account::query()->whereKey($payload['account_id'])->exists()) {
            $missing[] = 'account_id';
            $errors[] = 'Selected account could not be found.';
        }

        foreach (($payload['lines'] ?? []) as $index => $line) {
            if (!empty($line['product_id']) && !Product::query()->whereKey($line['product_id'])->exists()) {
                $missing[] = "lines.{$index}.product_id";
                $errors[] = 'One selected product could not be found.';
            }
            if (!empty($line['tax_rate_id']) && !TaxRate::query()->whereKey($line['tax_rate_id'])->exists()) {
                $missing[] = "lines.{$index}.tax_rate_id";
                $errors[] = 'One selected tax rate could not be found.';
            }
            if (!empty($line['account_id']) && !Account::query()->whereKey($line['account_id'])->exists()) {
                $missing[] = "lines.{$index}.account_id";
                $errors[] = 'One selected expense account could not be found.';
            }
        }

        return [
            'ok' => empty($missing),
            'missing_fields' => array_values(array_unique($missing)),
            'errors' => array_values(array_unique($errors)),
        ];
    }

    private function dateField(string $type): ?string
    {
        return [
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
        ][$type] ?? null;
    }
}
