<?php

namespace App\Services\AI\Assistant;

class AiToolRegistry
{
    private array $tools = [
        'financial_summary' => ['financial_summary_tool', 'ai.use'],
        'profit_and_loss' => ['profit_loss_tool', 'ai.use'],
        'balance_sheet' => ['balance_sheet_tool', 'ai.use'],
        'trial_balance' => ['trial_balance_tool', 'ai.use'],
        'ledger_query' => ['ledger_tool', 'ai.use'],
        'receivable_summary' => ['receivable_tool', 'ai.use'],
        'payable_summary' => ['payable_tool', 'ai.use'],
        'cash_bank_summary' => ['cash_bank_tool', 'ai.use'],
        'tax_summary' => ['tax_tool', 'ai.use'],
        'expense_summary' => ['expense_summary_tool', 'ai.use'],
        'sales_summary' => ['profit_loss_tool', 'ai.use'],
        'purchase_summary' => ['profit_loss_tool', 'ai.use'],
    ];

    public function forIntent(string $intent): ?array
    {
        if (! isset($this->tools[$intent])) {
            return null;
        }

        return [
            'name' => $this->tools[$intent][0],
            'required_permission' => $this->tools[$intent][1],
            'max_rows' => AiAssistantGuard::MAX_ROWS,
            'allowed_intents' => [$intent],
        ];
    }
}
