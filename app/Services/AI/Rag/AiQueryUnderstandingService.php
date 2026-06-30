<?php

namespace App\Services\AI\Rag;

class AiQueryUnderstandingService
{
    public function understand(array $query, array $payload = []): array
    {
        $text = $query['normalized'];
        $greeting = (bool) preg_match('/^(hi|hello|hey|thanks|thank you|good (morning|afternoon|evening))[!. ]*$/', $text);
        $appHelp = (bool) preg_match('/\b(how|where|configure|setting|settings|workflow|navigate|menu|support|kiteledger|permission|branch scope|what is|difference between)\b/', $text);
        $instructional = (bool) preg_match('/\b(how (do|can|should) i|how to|where (do|can) i|configure|difference between)\b/', $text);
        $report = (bool) preg_match('/\b(report|trial balance|balance sheet|profit and loss|cash flow|ledger|receivable|payable|summary)\b/', $text);
        $business = (bool) preg_match('/\b(invoice|customer|supplier|product|stock|inventory|sale|purchase|expense|payment|voucher|warehouse|quotation|order|account|balance|vat|tax)\b/', $text);
        $exact = ! empty($query['identifiers']) || (bool) preg_match('/\b(exact|number|code|sku)\b/', $text);
        $offTopic = (bool) preg_match('/\b(weather|football|movie|recipe|poem|celebrity|politics)\b/', $text) && ! $business && ! $appHelp;
        $recent = (bool) preg_match('/\b(today|current|recent|latest|this (week|month|year)|last (week|month|year))\b/', $text);

        $intent = match (true) {
            $greeting => 'greeting',
            $offTopic => 'unsupported',
            $exact && $business => 'exact_record_lookup',
            $report => 'report_question',
            $instructional => 'app_help',
            $appHelp && ! $business => 'app_help',
            $business => 'business_data',
            $appHelp => 'app_help',
            default => 'general_erp_concept',
        };

        return [
            'intent' => $intent,
            'use_retrieval' => ! in_array($intent, ['greeting', 'unsupported'], true),
            'prefer_app_knowledge' => in_array($intent, ['app_help', 'general_erp_concept'], true),
            'exact_lookup' => $intent === 'exact_record_lookup',
            'broad_summary' => (bool) preg_match('/\b(summarize|overview|what happened|explain|trend)\b/', $text),
            'recent' => $recent,
            'module' => $this->module($text, $payload),
            'status' => $this->status($text),
            'date_range' => $this->dateRange($text),
        ];
    }

    private function module(string $text, array $payload): ?string
    {
        $map = [
            'invoice' => 'Sales', 'quotation' => 'Sales', 'sales' => 'Sales',
            'purchase' => 'Purchase', 'supplier' => 'Purchase', 'expense' => 'Purchase',
            'inventory' => 'Inventory', 'stock' => 'Inventory', 'product' => 'Inventory',
            'journal' => 'Accounting', 'account' => 'Accounting', 'ledger' => 'Accounting',
            'customer' => 'Contacts', 'contact' => 'Contacts', 'report' => 'Reports',
            'cheque' => 'Settings', 'gateway' => 'Settings', 'setting' => 'Settings',
        ];

        foreach ($map as $needle => $module) {
            if (str_contains($text, $needle)) {
                return $module;
            }
        }

        return isset($payload['module']) ? ucfirst((string) $payload['module']) : null;
    }

    private function status(string $text): ?string
    {
        foreach (['unpaid', 'overdue', 'draft', 'approved', 'posted', 'paid', 'void'] as $status) {
            if (str_contains($text, $status)) {
                return $status;
            }
        }

        return null;
    }

    private function dateRange(string $text): array
    {
        return match (true) {
            str_contains($text, 'today') => ['from' => now()->toDateString(), 'to' => now()->toDateString()],
            str_contains($text, 'this month') => ['from' => now()->startOfMonth()->toDateString(), 'to' => now()->endOfMonth()->toDateString()],
            str_contains($text, 'this year') => ['from' => now()->startOfYear()->toDateString(), 'to' => now()->endOfYear()->toDateString()],
            default => [],
        };
    }
}
