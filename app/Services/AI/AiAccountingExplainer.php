<?php

namespace App\Services\AI;

use App\Models\Invoice;
use App\Models\JournalVoucher;

class AiAccountingExplainer
{
    public function __construct(protected AiProviderService $provider) {}

    public function explain(string $module, string $recordId): array
    {
        $entries = [];
        $summary = '';
        $context = [];

        switch ($module) {
            case 'invoice':
            case 'invoices':
                $invoice = Invoice::with('contact')->find($recordId);
                if (!$invoice) {
                    return ['summary' => 'Invoice not found.', 'entries' => [], 'plain_english' => '', 'risk_notes' => []];
                }
                $entries = [
                    ['side' => 'debit',  'account' => 'Accounts Receivable', 'amount' => (float) $invoice->total],
                    ['side' => 'credit', 'account' => 'Sales Revenue',       'amount' => (float) $invoice->total],
                ];
                $summary = 'This invoice increases receivable and sales revenue.';
                $context = ['invoice_no' => $invoice->invoice_no, 'total' => $invoice->total];
                break;

            case 'journal-voucher':
            case 'journal_voucher':
            case 'journal_vouchers':
                $jv = JournalVoucher::with('lines.chartOfAccount')->find($recordId);
                if (!$jv) {
                    return ['summary' => 'Journal voucher not found.', 'entries' => [], 'plain_english' => '', 'risk_notes' => []];
                }
                foreach ($jv->lines as $line) {
                    if ((float) $line->debit > 0) {
                        $entries[] = ['side' => 'debit', 'account' => optional($line->chartOfAccount)->name ?? 'Unknown', 'amount' => (float) $line->debit];
                    }
                    if ((float) $line->credit > 0) {
                        $entries[] = ['side' => 'credit', 'account' => optional($line->chartOfAccount)->name ?? 'Unknown', 'amount' => (float) $line->credit];
                    }
                }
                $summary = $jv->narration ?: 'Manual journal entry';
                $context = ['voucher_no' => $jv->voucher_no];
                break;

            default:
                return ['summary' => 'Unsupported module', 'entries' => [], 'plain_english' => '', 'risk_notes' => []];
        }

        // Ask LLM for plain-English explanation
        $plain = $this->plainEnglish($summary, $entries, $context);

        return [
            'summary'       => $summary,
            'entries'       => $entries,
            'plain_english' => $plain,
            'risk_notes'    => [],
        ];
    }

    private function plainEnglish(string $summary, array $entries, array $context): string
    {
        try {
            $sys = 'You are an accountant explaining journal impact in plain English to a small business owner. Be concise.';
            $usr = "Summary: {$summary}\nContext: " . json_encode($context) . "\nEntries: " . json_encode($entries)
                . "\nExplain in 2–3 short sentences what this means for the business.";

            $r = $this->provider->text(module: 'accounting_copilot', systemPrompt: $sys, userPrompt: $usr);
            return trim($r['text'] ?? '');
        } catch (\Throwable) {
            return $summary;
        }
    }
}
