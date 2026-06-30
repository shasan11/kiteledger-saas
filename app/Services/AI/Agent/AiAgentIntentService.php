<?php

namespace App\Services\AI\Agent;

class AiAgentIntentService
{
    public function resolve(string $message, array $payload = []): array
    {
        $text = trim($message);
        $m = mb_strtolower($text);
        $module = $this->moduleFromText($m, $payload);
        $instructional = (bool) preg_match('/\b(how (do|can|should) i|how to|where (do|can) i|explain|what is|what does|difference between)\b/', $m);

        if ($this->containsAny($m, ['show report', 'generate report', 'open report', 'trial balance', 'profit and loss', 'income statement', 'balance sheet', 'cash flow', 'ageing', 'aging', 'general ledger'])) {
            return $this->intent('show_report', $module ?: 'reports', true, false, 0.82);
        }

        if ($this->containsAny($m, ['show ', 'list ', 'find ', 'search ', 'where is', 'open '])) {
            return $this->intent('search_records', $module ?: 'records', true, false, 0.78);
        }

        if (! $instructional && $this->containsAny($m, ['update ', 'change ', 'modify ', 'edit ', 'set '])) {
            return $this->intent('update_record', $module ?: ($payload['module'] ?? 'records'), true, true, 0.76);
        }

        if (! $instructional && $this->containsAny($m, ['create ', 'make ', 'add ', 'prepare ', 'draft ', 'new '])) {
            return $this->intent('create_record', $module ?: 'records', true, true, 0.76);
        }

        if ($this->containsAny($m, ['explain ', 'what is this', 'why ', 'how ', 'analyze ', 'analyse ', 'summarize ', 'summarise '])) {
            return $this->intent('analyze_business', $module ?: ($payload['module'] ?? 'general'), true, false, 0.68);
        }

        return $this->intent('ask_question', $module ?: ($payload['module'] ?? 'general'), true, false, 0.55);
    }

    private function intent(string $intent, string $module, bool $needsContext, bool $approval, float $confidence): array
    {
        return [
            'name' => $intent,
            'module' => $this->normalizeModule($module),
            'confidence' => $confidence,
            'requires_context' => $needsContext,
            'requires_approval' => $approval,
        ];
    }

    private function moduleFromText(string $m, array $payload): ?string
    {
        $url = mb_strtolower((string) ($payload['url'] ?? ''));
        $haystack = trim($m.' '.$url.' '.mb_strtolower((string) ($payload['module'] ?? '')));

        $rules = [
            'quotations' => ['quotation', 'quote'],
            'sales_orders' => ['sales order'],
            'invoices' => ['invoice', 'sales bill', 'unpaid invoice'],
            'customer_payments' => ['customer payment', 'collect payment', 'receipt', 'payment in'],
            'credit_notes' => ['credit note'],
            'purchase_orders' => ['purchase order'],
            'purchase_bills' => ['purchase bill', 'supplier bill', 'bill'],
            'supplier_payments' => ['supplier payment', 'payment out'],
            'debit_notes' => ['debit note'],
            'expenses' => ['expense'],
            'journal_vouchers' => ['journal voucher', 'journal entry', 'jv'],
            'cash_transfers' => ['cash transfer'],
            'products' => ['product', 'item', 'stock'],
            'contacts' => ['customer', 'supplier', 'contact', 'sachin'],
            'reports' => ['report', 'trial balance', 'income statement', 'profit and loss', 'balance sheet', 'cash flow'],
        ];

        foreach ($rules as $module => $needles) {
            if ($this->containsAny($haystack, $needles)) {
                return $module;
            }
        }

        return null;
    }

    private function normalizeModule(string $module): string
    {
        return str_replace('-', '_', trim($module));
    }

    private function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if ($needle !== '' && str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    }
}
