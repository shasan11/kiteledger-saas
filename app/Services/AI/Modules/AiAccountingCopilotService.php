<?php

namespace App\Services\AI\Modules;

use App\Models\ChartOfAccount;
use App\Models\JournalVoucher;
use App\Services\AI\AiActionGuard;
use App\Services\AI\AiContextBuilder;
use App\Services\AI\AiPromptService;
use App\Services\AI\AiProviderService;

class AiAccountingCopilotService
{
    protected const MODULE     = 'accounting_copilot';
    protected const PERMISSION = 'ai.accounting_copilot.use';

    public function __construct(
        protected AiActionGuard     $guard,
        protected AiProviderService  $provider,
        protected AiContextBuilder  $contextBuilder,
        protected AiPromptService   $prompts,
    ) {}

    public function explainJournal(string $jvId): array
    {
        $this->guard->assertModuleEnabled(self::MODULE);
        $this->guard->assertUserCanUse(self::PERMISSION);

        $jv = JournalVoucher::with('lines')->findOrFail($jvId);

        $context = $this->contextBuilder->journalVoucherContext($jv);

        $userPrompt = "Explain this journal voucher in plain English:\n\n"
            . json_encode($context, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
            . "\n\nReturn JSON with: summary, debit_explanation, credit_explanation, accounting_logic, risk_level (low|medium|high), issues (array), recommended_action.";

        $result = $this->provider->structured(
            module: self::MODULE,
            systemPrompt: $this->prompts->accountingCopilotPrompt(),
            userPrompt: $userPrompt,
            context: $context,
        );

        $data = $result['data'] ?? [];

        return array_merge([
            'summary'              => '',
            'debit_explanation'    => '',
            'credit_explanation'   => '',
            'accounting_logic'     => '',
            'risk_level'           => 'low',
            'issues'               => [],
            'recommended_action'   => '',
        ], $data);
    }

    public function suggestAccount(array $input): array
    {
        $this->guard->assertModuleEnabled(self::MODULE);
        $this->guard->assertUserCanUse(self::PERMISSION);

        $description     = $input['description']      ?? '';
        $transactionType = $input['transaction_type'] ?? 'general';
        $amount          = $input['amount']           ?? 0;

        // Load chart of accounts as context (names + types only)
        $accounts = ChartOfAccount::select('id', 'name', 'account_type', 'code')
            ->limit(200)
            ->get()
            ->map(fn ($a) => ['id' => $a->id, 'code' => $a->code, 'name' => $a->name, 'type' => $a->account_type])
            ->toArray();

        $userPrompt = "Transaction description: \"{$description}\"\n"
            . "Transaction type: {$transactionType}\n"
            . "Amount: {$amount}\n\n"
            . "Available chart of accounts:\n" . json_encode($accounts)
            . "\n\nSuggest the best matching account from the list above. "
            . "Return JSON with: suggested_account_id, suggested_account_name, suggested_account_code, "
            . "confidence (high|medium|low), reason, suggest_create_new_account (boolean, true only if no suitable account exists). "
            . "If suggest_create_new_account is true, add: suggested_new_name, suggested_new_type.";

        $result = $this->provider->structured(
            module: self::MODULE,
            systemPrompt: $this->prompts->accountingCopilotPrompt(),
            userPrompt: $userPrompt,
        );

        $data = $result['data'] ?? [];

        return array_merge([
            'suggested_account_id'    => null,
            'suggested_account_name'  => null,
            'suggested_account_code'  => null,
            'confidence'              => 'low',
            'reason'                  => '',
            'suggest_create_new_account' => false,
        ], $data);
    }
}
