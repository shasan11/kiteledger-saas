<?php

namespace App\Services\AI;

use App\DTO\Ai\AiActionProposalData;
use App\Enums\Ai\AiIntentType;
use App\Enums\Ai\AiRiskLevel;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\Product;
use Throwable;

/**
 * Turns a detected intent into a concrete, structured action proposal.
 * Never invents IDs — if no DB match, the proposal carries missing_fields
 * so the UI can prompt the user to choose.
 */
class AiActionPlanner
{
    public function __construct(protected AiProviderService $provider) {}

    public function plan(AiIntentType $intent, string $message, array $pageContext = [], array $extracted = []): ?AiActionProposalData
    {
        return match ($intent) {
            AiIntentType::CREATE_INVOICE_DRAFT         => $this->planInvoice($message, $extracted),
            AiIntentType::CREATE_JOURNAL_VOUCHER_DRAFT => $this->planJournalVoucher($message, $extracted),
            default                                    => null,
        };
    }

    private function planInvoice(string $message, array $hints): AiActionProposalData
    {
        $extracted = $this->extract($message, [
            'customer_name'  => 'string — name of the customer/contact',
            'items'          => 'array of {name, quantity, rate}',
            'tax_percent'    => 'number (e.g. 13)',
            'currency_code'  => 'string ISO if mentioned',
            'invoice_date'   => 'YYYY-MM-DD if mentioned',
        ], $hints);

        $missing = [];
        $resolvedContact = null;
        if (!empty($extracted['customer_name'])) {
            $matches = Contact::query()
                ->where('name', 'like', '%' . $extracted['customer_name'] . '%')
                ->limit(5)
                ->get(['id', 'name']);

            if ($matches->count() === 1) {
                $resolvedContact = $matches->first();
            } elseif ($matches->count() === 0) {
                $missing[] = ['field' => 'contact_id', 'reason' => 'No contact matched "' . $extracted['customer_name'] . '"'];
            } else {
                $missing[] = [
                    'field'   => 'contact_id',
                    'reason'  => 'Multiple contacts matched — pick one',
                    'options' => $matches->map(fn($c) => ['id' => $c->id, 'label' => $c->name])->toArray(),
                ];
            }
        } else {
            $missing[] = ['field' => 'contact_id', 'reason' => 'Customer not specified'];
        }

        $lines = [];
        foreach (($extracted['items'] ?? []) as $item) {
            $name = $item['name'] ?? null;
            $qty  = (float) ($item['quantity'] ?? 1);
            $rate = (float) ($item['rate'] ?? 0);

            $resolved = null;
            if ($name) {
                $matches = Product::query()
                    ->where('name', 'like', '%' . $name . '%')
                    ->limit(5)
                    ->get(['id', 'name']);

                if ($matches->count() === 1) {
                    $resolved = $matches->first();
                } elseif ($matches->count() > 1) {
                    $missing[] = [
                        'field'   => 'product:' . $name,
                        'reason'  => 'Multiple products matched',
                        'options' => $matches->map(fn($p) => ['id' => $p->id, 'label' => $p->name])->toArray(),
                    ];
                } else {
                    $missing[] = ['field' => 'product:' . $name, 'reason' => 'No product matched'];
                }
            }

            $lines[] = [
                'product_id'   => $resolved?->id,
                'product_name' => $resolved?->name ?? $name,
                'quantity'     => $qty,
                'rate'         => $rate,
                'amount'       => $qty * $rate,
            ];
        }

        $subtotal = array_sum(array_map(fn($l) => $l['amount'], $lines));
        $tax      = $subtotal * (float) ($extracted['tax_percent'] ?? 0) / 100;
        $total    = $subtotal + $tax;

        $payload = [
            'contact_id'     => $resolvedContact?->id,
            'contact_name'   => $resolvedContact?->name ?? ($extracted['customer_name'] ?? null),
            'invoice_date'   => $extracted['invoice_date'] ?? now()->toDateString(),
            'currency_code'  => $extracted['currency_code'] ?? null,
            'lines'          => $lines,
            'tax_percent'    => (float) ($extracted['tax_percent'] ?? 0),
            'subtotal'       => $subtotal,
            'tax_total'      => $tax,
            'total'          => $total,
        ];

        $risk = empty($missing) ? AiRiskLevel::LOW : AiRiskLevel::MEDIUM;

        return new AiActionProposalData(
            actionType:    'create_invoice_draft',
            title:         'Create draft invoice',
            summary:       'Invoice draft for ' . ($payload['contact_name'] ?? 'customer') . ' — total ' . number_format($total, 2),
            payload:       $payload,
            module:        'invoices',
            riskLevel:     $risk,
            riskReasons:   array_map(fn($m) => $m['reason'], $missing),
            missingFields: $missing,
            requiresApproval: true,
        );
    }

    private function planJournalVoucher(string $message, array $hints): AiActionProposalData
    {
        $extracted = $this->extract($message, [
            'narration'    => 'short narration',
            'voucher_date' => 'YYYY-MM-DD',
            'debits'       => 'array of {account_name, amount}',
            'credits'      => 'array of {account_name, amount}',
        ], $hints);

        $missing = [];
        $resolvedDebits  = $this->resolveAccountLines($extracted['debits']  ?? [], 'debit',  $missing);
        $resolvedCredits = $this->resolveAccountLines($extracted['credits'] ?? [], 'credit', $missing);

        $totalDebit  = array_sum(array_map(fn($l) => (float) $l['amount'], $resolvedDebits));
        $totalCredit = array_sum(array_map(fn($l) => (float) $l['amount'], $resolvedCredits));
        $balanced    = abs($totalDebit - $totalCredit) < 0.01 && $totalDebit > 0;

        if (!$balanced) {
            $missing[] = ['field' => 'balance', 'reason' => "Debits ({$totalDebit}) and credits ({$totalCredit}) are not equal"];
        }

        $payload = [
            'voucher_date' => $extracted['voucher_date'] ?? now()->toDateString(),
            'narration'    => $extracted['narration'] ?? '',
            'debits'       => $resolvedDebits,
            'credits'      => $resolvedCredits,
            'total_debit'  => $totalDebit,
            'total_credit' => $totalCredit,
            'balanced'     => $balanced,
        ];

        $risk = $balanced && empty($missing) ? AiRiskLevel::LOW : AiRiskLevel::HIGH;

        return new AiActionProposalData(
            actionType:       'create_journal_voucher_draft',
            title:            'Create draft journal voucher',
            summary:          ($payload['narration'] ?: 'Manual journal entry') . ' — ' . number_format($totalDebit, 2),
            payload:          $payload,
            module:           'journal_vouchers',
            riskLevel:        $risk,
            riskReasons:      array_map(fn($m) => $m['reason'], $missing),
            missingFields:    $missing,
            requiresApproval: true,
        );
    }

    private function resolveAccountLines(array $lines, string $side, array &$missing): array
    {
        $out = [];
        foreach ($lines as $line) {
            $name   = $line['account_name'] ?? null;
            $amount = (float) ($line['amount'] ?? 0);
            $account = null;

            if ($name) {
                $matches = ChartOfAccount::query()
                    ->where('name', 'like', '%' . $name . '%')
                    ->limit(5)
                    ->get(['id', 'name']);

                if ($matches->count() === 1) {
                    $account = $matches->first();
                } elseif ($matches->count() > 1) {
                    $missing[] = [
                        'field'   => $side . ':' . $name,
                        'reason'  => 'Multiple accounts matched',
                        'options' => $matches->map(fn($a) => ['id' => $a->id, 'label' => $a->name])->toArray(),
                    ];
                } else {
                    $missing[] = ['field' => $side . ':' . $name, 'reason' => 'No chart-of-account matched'];
                }
            }

            $out[] = [
                'account_id'   => $account?->id,
                'account_name' => $account?->name ?? $name,
                'amount'       => $amount,
            ];
        }
        return $out;
    }

    private function extract(string $message, array $schemaHints, array $hints = []): array
    {
        $schemaText = '';
        foreach ($schemaHints as $key => $desc) {
            $schemaText .= "- {$key}: {$desc}\n";
        }

        $sys = "Extract structured fields from an ERP/accounting command. Return JSON only — no prose, no markdown.";
        $usr = "User message: \"" . str_replace('"', "'", $message) . "\"\n"
            . "Prior hints: " . json_encode($hints) . "\n"
            . "Extract these fields:\n{$schemaText}\n"
            . "If a field is unknown, omit it. Return a single JSON object.";

        try {
            $result = $this->provider->structured(
                module: 'global_command',
                systemPrompt: $sys,
                userPrompt: $usr,
            );
            $data = $result['data'] ?? [];
            return is_array($data) ? $data : [];
        } catch (Throwable) {
            return [];
        }
    }
}
