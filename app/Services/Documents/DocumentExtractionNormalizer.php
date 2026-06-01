<?php

namespace App\Services\Documents;

class DocumentExtractionNormalizer
{
    public function normalize(array $extracted): array
    {
        $out = $extracted;

        $out['document_type'] = $this->normalizeDocumentType($extracted['document_type'] ?? null);
        $out['confidence'] = $this->floatOrNull($extracted['confidence'] ?? null);
        $out['document_date'] = $this->normalizeDate($extracted['document_date'] ?? null);
        $out['due_date'] = $this->normalizeDate($extracted['due_date'] ?? null);
        $out['currency_code'] = $this->normalizeCurrency($extracted['currency_code'] ?? null);

        $party = $extracted['party'] ?? [];
        $out['party'] = [
            'role' => isset($party['role']) ? strtolower(trim((string) $party['role'])) : null,
            'name' => $this->trimOrNull($party['name'] ?? null),
            'tax_number' => $this->trimOrNull($party['tax_number'] ?? null),
            'email' => $this->trimOrNull($party['email'] ?? null),
            'phone' => $this->trimOrNull($party['phone'] ?? null),
            'address' => $this->trimOrNull($party['address'] ?? null),
        ];

        $lines = [];
        foreach (($extracted['lines'] ?? []) as $line) {
            if (!is_array($line)) continue;
            $qty = $this->amount($line['quantity'] ?? null) ?? 1;
            $rate = $this->amount($line['rate'] ?? null) ?? 0;
            $amount = $this->amount($line['amount'] ?? null);
            if ($amount === null) $amount = round($qty * $rate, 2);
            $lines[] = [
                'description' => $this->trimOrNull($line['description'] ?? null),
                'product_code' => $this->trimOrNull($line['product_code'] ?? null),
                'product_name' => $this->trimOrNull($line['product_name'] ?? $line['description'] ?? null),
                'quantity' => $qty,
                'unit' => $this->trimOrNull($line['unit'] ?? null),
                'rate' => $rate,
                'discount' => $this->amount($line['discount'] ?? 0) ?? 0,
                'tax_rate' => $this->amount($line['tax_rate'] ?? 0) ?? 0,
                'tax_amount' => $this->amount($line['tax_amount'] ?? 0) ?? 0,
                'amount' => $amount,
                'account_hint' => $this->trimOrNull($line['account_hint'] ?? null),
            ];
        }
        $out['lines'] = $lines;

        $subtotal = array_sum(array_column($lines, 'amount'));
        $taxTotal = array_sum(array_column($lines, 'tax_amount'));
        $totals = $extracted['totals'] ?? [];
        $grand = $this->amount($totals['grand_total'] ?? null);
        $out['totals'] = [
            'subtotal' => $this->amount($totals['subtotal'] ?? null) ?? round($subtotal, 2),
            'discount_total' => $this->amount($totals['discount_total'] ?? 0) ?? 0,
            'tax_total' => $this->amount($totals['tax_total'] ?? null) ?? round($taxTotal, 2),
            'shipping' => $this->amount($totals['shipping'] ?? 0) ?? 0,
            'grand_total' => $grand ?? round($subtotal + $taxTotal, 2),
            'paid_amount' => $this->amount($totals['paid_amount'] ?? 0) ?? 0,
            'balance_due' => $this->amount($totals['balance_due'] ?? null),
        ];

        $out['payment'] = $extracted['payment'] ?? null;
        $out['inventory'] = $extracted['inventory'] ?? null;
        $out['journal_entry'] = $extracted['journal_entry'] ?? null;
        $out['terms_and_conditions'] = $this->trimOrNull($extracted['terms_and_conditions'] ?? null);

        $warnings = is_array($extracted['warnings'] ?? null) ? $extracted['warnings'] : [];
        $missing = is_array($extracted['missing_fields'] ?? null) ? $extracted['missing_fields'] : [];

        // Cross-check totals
        if ($grand !== null && abs($grand - ($out['totals']['subtotal'] + $out['totals']['tax_total'] - $out['totals']['discount_total'] + $out['totals']['shipping'])) > 0.05) {
            $warnings[] = 'Grand total does not match line items and taxes.';
        }
        if (!$out['party']['name']) $missing[] = 'party.name';
        if (!$out['document_date']) $missing[] = 'document_date';
        if (empty($out['lines']) && !in_array($out['document_type'], ['customer_payment_slip', 'supplier_payment_slip', 'journal_voucher'], true)) {
            $warnings[] = 'No line items detected.';
        }

        $out['warnings'] = array_values(array_unique($warnings));
        $out['missing_fields'] = array_values(array_unique($missing));

        $out['document_number'] = $this->trimOrNull($extracted['document_number'] ?? null);

        return $out;
    }

    private function normalizeDocumentType(?string $type): string
    {
        $allowed = [
            'unknown', 'sales_invoice', 'purchase_bill', 'expense_receipt',
            'customer_payment_slip', 'supplier_payment_slip', 'credit_note',
            'debit_note', 'journal_voucher', 'purchase_order', 'sales_order',
            'quotation', 'warehouse_transfer', 'inventory_adjustment',
            'bank_statement', 'other',
        ];
        $t = strtolower(trim((string) $type));
        $t = str_replace([' ', '-'], '_', $t);
        return in_array($t, $allowed, true) ? $t : 'unknown';
    }

    private function normalizeDate(?string $value): ?string
    {
        if (!$value) return null;
        try {
            return \Carbon\Carbon::parse($value)->format('Y-m-d');
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function normalizeCurrency(?string $code): ?string
    {
        if (!$code) return null;
        $c = strtoupper(trim($code));
        return preg_match('/^[A-Z]{3}$/', $c) ? $c : null;
    }

    private function amount($value): ?float
    {
        if ($value === null || $value === '') return null;
        if (is_numeric($value)) return (float) $value;
        $clean = preg_replace('/[^0-9.\-]/', '', (string) $value);
        return is_numeric($clean) ? (float) $clean : null;
    }

    private function floatOrNull($value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    private function trimOrNull($value): ?string
    {
        if ($value === null) return null;
        $s = trim((string) $value);
        return $s === '' ? null : $s;
    }
}
