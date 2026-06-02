<?php

namespace App\Services\AI\Assistant;

use App\Services\AI\AiPermissionService;
use App\Services\AI\AiProviderException;
use App\Services\AI\AiProviderManager;
use App\Services\AI\AiSettingsService;
use Illuminate\Http\Request;

class AiFinancialAnswerService
{
    public function __construct(
        private readonly AiAssistantGuard $guard,
        private readonly AiIntentClassifier $classifier,
        private readonly AiQueryPlanner $planner,
        private readonly JournalVoucherFinancialService $financials,
        private readonly AiResponseFormatter $formatter,
        private readonly AiPermissionService $permissions,
        private readonly AiProviderManager $provider,
        private readonly AiSettingsService $settings,
    ) {}

    public function answer(Request $request, string $message, array $payload = []): ?array
    {
        if ($this->guard->isBroadUnsafeQuestion($message)) {
            return $this->guard->broadQuestionClarification();
        }

        if (! $this->settings->financialAssistantEnabled()) {
            return null;
        }

        $classification = $this->classifier->classify($message);
        $intent = $classification['intent'] ?? 'unsupported';
        if (! $this->isControlledIntent($intent)) {
            return null;
        }

        $plan = $this->planner->plan($request, $classification);
        if (! ($plan['ok'] ?? false)) {
            return [
                'ok' => true,
                'intent' => $intent,
                'answer_type' => 'clarification',
                'message' => $plan['clarification'] ?? 'Please provide a little more detail.',
                'cards' => [],
                'tables' => ! empty($plan['matches']) ? [[
                    'title' => 'Possible Matches',
                    'columns' => [
                        ['key' => 'type', 'label' => 'Type'],
                        ['key' => 'name', 'label' => 'Name'],
                        ['key' => 'code', 'label' => 'Code'],
                    ],
                    'rows' => $plan['matches'],
                ]] : [],
                'warnings' => [],
                'source_note' => null,
                'followups' => ['Show Profit & Loss', 'Show receivables summary'],
            ];
        }

        $required = $plan['tool']['required_permission'] ?? 'ai.use';
        if (! $this->permissions->hasAny($request->user(), [$required, 'ai.chat', 'ai.manage'])) {
            return [
                'ok' => true,
                'intent' => $intent,
                'answer_type' => 'permission_denied',
                'message' => 'You do not have access to this information.',
                'cards' => [],
                'tables' => [],
                'warnings' => [],
                'source_note' => null,
                'followups' => [],
            ];
        }

        $result = $this->runTool($request, $intent, $plan['filters']);
        $display = $this->formatter->format($intent, $result, $plan);
        $display['intent'] = $intent;
        $display['selected_tool'] = $plan['tool']['name'] ?? null;
        $display['filters'] = $this->publicFilters($plan['filters']);

        $display['message'] = $this->explain($message, $display, $result);

        return $display;
    }

    private function runTool(Request $request, string $intent, array $filters): array
    {
        return match ($intent) {
            'profit_and_loss', 'sales_summary', 'purchase_summary', 'expense_summary' => $this->financials->incomeExpenseSummary($request, $filters),
            'balance_sheet' => $this->financials->balanceSheet($request, $filters),
            'trial_balance' => $this->financials->trialBalance($request, $filters),
            'ledger_query' => ($filters['entity_type'] ?? null) === 'contact'
                ? $this->financials->contactLedger($request, $filters)
                : $this->financials->accountLedger($request, $filters),
            'receivable_summary' => $this->financials->receivableSummary($request, $filters),
            'payable_summary' => $this->financials->payableSummary($request, $filters),
            'cash_bank_summary' => $this->financials->cashBankSummary($request, $filters),
            'tax_summary' => $this->financials->taxSummary($request, $filters),
            default => [],
        };
    }

    private function explain(string $question, array $display, array $result): string
    {
        if (! $this->settings->enabled() || ! ($this->settings->hasApiKey() || $this->settings->provider() === 'ollama')) {
            return $display['message'];
        }

        try {
            $response = $this->provider->chat([
                ['role' => 'system', 'content' => 'You are a finance assistant. Explain only the backend-calculated result in plain business language. Do not add new amounts. Do not mention tables, SQL, payloads, IDs, or internal field names.'],
                ['role' => 'user', 'content' => json_encode([
                    'question' => $question,
                    'message' => $display['message'],
                    'cards' => $display['cards'] ?? [],
                    'source_note' => $display['source_note'] ?? null,
                ], JSON_UNESCAPED_SLASHES)],
            ], ['max_tokens' => 180, 'temperature' => 0.1, 'timeout' => 30]);

            return trim((string) ($response['text'] ?? '')) ?: $display['message'];
        } catch (AiProviderException) {
            $display['warnings'][] = 'The report was prepared, but AI explanation is temporarily unavailable.';
            return $display['message'];
        } catch (\Throwable) {
            return $display['message'];
        }
    }

    private function publicFilters(array $filters): array
    {
        $range = $filters['date_range'] ?? [];

        return array_filter([
            'date_from' => $range['from'] ?? null,
            'date_to' => $range['to'] ?? null,
            'scope' => $range['label'] ?? null,
            'entity' => $filters['entity_label'] ?? null,
        ]);
    }

    private function isControlledIntent(string $intent): bool
    {
        return in_array($intent, [
            'profit_and_loss',
            'balance_sheet',
            'trial_balance',
            'ledger_query',
            'sales_summary',
            'purchase_summary',
            'receivable_summary',
            'payable_summary',
            'cash_bank_summary',
            'tax_summary',
            'expense_summary',
        ], true);
    }
}
