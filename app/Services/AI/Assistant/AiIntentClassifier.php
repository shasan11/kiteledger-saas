<?php

namespace App\Services\AI\Assistant;

use Carbon\CarbonImmutable;

class AiIntentClassifier
{
    public function classify(string $message): array
    {
        $text = mb_strtolower(trim($message));
        $intent = match (true) {
            $this->hasAny($text, ['profit', 'loss', 'p&l', 'income statement']) => 'profit_and_loss',
            $this->hasAny($text, ['balance sheet']) => 'balance_sheet',
            $this->hasAny($text, ['trial balance']) => 'trial_balance',
            $this->hasAny($text, ['ledger']) => 'ledger_query',
            $this->hasAny($text, ['journal impact', 'journal voucher', 'journal entry', ' jv']) => 'journal_voucher_query',
            $this->hasAny($text, ['total sales', 'sales summary', 'revenue']) => 'sales_summary',
            $this->hasAny($text, ['total purchase', 'purchase summary', 'purchases']) => 'purchase_summary',
            $this->hasAny($text, ['receivable', 'customers owe', 'customer balance']) => 'receivable_summary',
            $this->hasAny($text, ['payable', 'owe suppliers', 'supplier balance']) => 'payable_summary',
            $this->hasAny($text, ['cash and bank', 'cash balance', 'bank balance', 'cash in hand']) => 'cash_bank_summary',
            $this->hasAny($text, ['tax payable', 'tax summary', 'vat']) => 'tax_summary',
            $this->hasAny($text, ['expense summary', 'top expenses', 'expenses']) => 'expense_summary',
            $this->hasAny($text, ['top customers', 'customer summary']) => 'customer_summary',
            $this->hasAny($text, ['top suppliers', 'supplier summary']) => 'supplier_summary',
            $this->hasAny($text, ['inventory value', 'stock value', 'low stock']) => 'inventory_summary',
            $this->hasAny($text, ['uploaded documents', 'document summary', 'extracted documents']) => 'document_summary',
            $this->hasAny($text, ['invoice no', 'bill no', 'document number', 'transaction']) => 'transaction_lookup',
            $this->hasAny($text, ['help', 'what can you do']) => 'general_help',
            default => 'unsupported',
        };

        return [
            'intent' => $intent,
            'filters' => array_filter([
                'date_range' => $this->dateRange($text, $intent),
                'entity_name' => $this->entityName($message, $intent),
                'document_number' => $this->documentNumber($message),
                'comparison' => $this->hasAny($text, ['compare', 'vs ', 'versus']),
                'report_format' => $this->hasAny($text, ['table', 'list']) ? 'table' : null,
            ]),
            'confidence' => $intent === 'unsupported' ? 0.35 : 0.86,
        ];
    }

    private function dateRange(string $text, string $intent): array
    {
        $today = CarbonImmutable::today();

        if (str_contains($text, 'today')) {
            return ['from' => $today->toDateString(), 'to' => $today->toDateString(), 'label' => 'today'];
        }

        if (str_contains($text, 'yesterday')) {
            $date = $today->subDay();
            return ['from' => $date->toDateString(), 'to' => $date->toDateString(), 'label' => 'yesterday'];
        }

        if (str_contains($text, 'last month')) {
            $start = $today->subMonthNoOverflow()->startOfMonth();
            return ['from' => $start->toDateString(), 'to' => $start->endOfMonth()->toDateString(), 'label' => 'last month'];
        }

        if (str_contains($text, 'this month') || in_array($intent, ['sales_summary', 'purchase_summary', 'expense_summary', 'profit_and_loss'], true)) {
            return ['from' => $today->startOfMonth()->toDateString(), 'to' => $today->endOfMonth()->toDateString(), 'label' => 'this month'];
        }

        if (str_contains($text, 'this week')) {
            return ['from' => $today->startOfWeek()->toDateString(), 'to' => $today->endOfWeek()->toDateString(), 'label' => 'this week'];
        }

        return ['from' => null, 'to' => null, 'label' => 'current fiscal year'];
    }

    private function entityName(string $message, string $intent): ?string
    {
        if (! in_array($intent, ['ledger_query', 'customer_summary', 'supplier_summary'], true)) {
            return null;
        }

        if (preg_match('/(?:ledger|of|for)\s+(.+)$/i', $message, $matches)) {
            return trim($matches[1], " \t\n\r\0\x0B?.");
        }

        return null;
    }

    private function documentNumber(string $message): ?string
    {
        if (preg_match('/\b[A-Z]{2,10}[-\/]?\d{2,}\b/i', $message, $matches)) {
            return strtoupper($matches[0]);
        }

        return null;
    }

    private function hasAny(string $text, array $needles): bool
    {
        foreach ($needles as $needle) {
            if ($needle !== '' && str_contains($text, $needle)) {
                return true;
            }
        }

        return false;
    }
}
