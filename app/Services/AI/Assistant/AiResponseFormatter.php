<?php

namespace App\Services\AI\Assistant;

class AiResponseFormatter
{
    public function format(string $intent, array $result, array $plan): array
    {
        return match ($intent) {
            'profit_and_loss', 'sales_summary', 'purchase_summary', 'expense_summary' => $this->profitLoss($intent, $result),
            'balance_sheet' => $this->balanceSheet($result),
            'trial_balance' => $this->trialBalance($result),
            'cash_bank_summary' => $this->cashBank($result),
            'tax_summary' => $this->tax($result),
            'receivable_summary' => $this->contactBalance($result, 'Receivables', 'customer'),
            'payable_summary' => $this->contactBalance($result, 'Payables', 'supplier'),
            'ledger_query' => $this->ledger($result),
            default => $this->generic($intent, $result),
        };
    }

    private function profitLoss(string $intent, array $result): array
    {
        $net = (float) ($result['net_profit'] ?? 0);
        $message = match ($intent) {
            'sales_summary' => 'Your total income is ' . $this->money($result['total_income'] ?? 0) . '.',
            'purchase_summary', 'expense_summary' => 'Your total expenses are ' . $this->money($result['total_expense'] ?? 0) . '.',
            default => 'Your net ' . ($net >= 0 ? 'profit' : 'loss') . ' is ' . $this->money(abs($net)) . '.',
        };

        return [
            'ok' => true,
            'answer_type' => 'financial_summary',
            'message' => $message,
            'cards' => [
                ['label' => 'Income', 'value' => $result['total_income'] ?? 0, 'format' => 'money'],
                ['label' => 'Expenses', 'value' => $result['total_expense'] ?? 0, 'format' => 'money'],
                ['label' => $net >= 0 ? 'Net Profit' : 'Net Loss', 'value' => abs($net), 'format' => 'money'],
            ],
            'tables' => [
                [
                    'title' => 'Income Accounts',
                    'columns' => [['key' => 'account', 'label' => 'Account'], ['key' => 'amount', 'label' => 'Amount', 'format' => 'money']],
                    'rows' => $result['income_accounts'] ?? [],
                ],
                [
                    'title' => 'Expense Accounts',
                    'columns' => [['key' => 'account', 'label' => 'Account'], ['key' => 'amount', 'label' => 'Amount', 'format' => 'money']],
                    'rows' => $result['expense_accounts'] ?? [],
                ],
            ],
            'warnings' => [],
            'source_note' => $result['source_summary'] ?? 'Based on posted journal entries.',
            'followups' => ['Show expense breakdown', 'Show cash and bank balance', 'Show trial balance'],
        ];
    }

    private function balanceSheet(array $result): array
    {
        return [
            'ok' => true,
            'answer_type' => 'balance_sheet',
            'message' => 'Here is your balance sheet summary.',
            'cards' => [
                ['label' => 'Assets', 'value' => $result['total_assets'] ?? 0, 'format' => 'money'],
                ['label' => 'Liabilities', 'value' => $result['total_liabilities'] ?? 0, 'format' => 'money'],
                ['label' => 'Equity', 'value' => $result['total_equity'] ?? 0, 'format' => 'money'],
            ],
            'tables' => [
                ['title' => 'Assets', 'columns' => $this->amountColumns(), 'rows' => $result['assets'] ?? []],
                ['title' => 'Liabilities', 'columns' => $this->amountColumns(), 'rows' => $result['liabilities'] ?? []],
                ['title' => 'Equity', 'columns' => $this->amountColumns(), 'rows' => $result['equity'] ?? []],
            ],
            'warnings' => [],
            'source_note' => $result['source_summary'] ?? 'Based on posted journal entries.',
            'followups' => ['Show trial balance', 'Show cash and bank balance'],
        ];
    }

    private function trialBalance(array $result): array
    {
        return [
            'ok' => true,
            'answer_type' => 'trial_balance',
            'message' => 'Here is your trial balance summary.',
            'cards' => [
                ['label' => 'Total Debit', 'value' => $result['total_debit'] ?? 0, 'format' => 'money'],
                ['label' => 'Total Credit', 'value' => $result['total_credit'] ?? 0, 'format' => 'money'],
            ],
            'tables' => [[
                'title' => 'Trial Balance',
                'columns' => [
                    ['key' => 'account', 'label' => 'Account'],
                    ['key' => 'type', 'label' => 'Type'],
                    ['key' => 'debit', 'label' => 'Debit', 'format' => 'money'],
                    ['key' => 'credit', 'label' => 'Credit', 'format' => 'money'],
                    ['key' => 'balance', 'label' => 'Balance', 'format' => 'money'],
                ],
                'rows' => $result['rows'] ?? [],
            ]],
            'warnings' => [],
            'source_note' => $result['source_summary'] ?? 'Based on posted journal entries.',
            'followups' => ['Show balance sheet', 'Show Profit & Loss'],
        ];
    }

    private function cashBank(array $result): array
    {
        return [
            'ok' => true,
            'answer_type' => 'cash_bank_summary',
            'message' => 'Here is your cash and bank balance summary.',
            'cards' => [
                ['label' => 'Cash Balance', 'value' => $result['cash_balance'] ?? 0, 'format' => 'money'],
                ['label' => 'Bank Balance', 'value' => $result['bank_balance'] ?? 0, 'format' => 'money'],
            ],
            'tables' => [[
                'title' => 'Cash and Bank Accounts',
                'columns' => [
                    ['key' => 'account', 'label' => 'Account'],
                    ['key' => 'inflow', 'label' => 'Inflow', 'format' => 'money'],
                    ['key' => 'outflow', 'label' => 'Outflow', 'format' => 'money'],
                    ['key' => 'closing', 'label' => 'Closing', 'format' => 'money'],
                ],
                'rows' => $result['accounts'] ?? [],
            ]],
            'warnings' => [],
            'source_note' => $result['source_summary'] ?? 'Based on posted journal entries.',
            'followups' => ['Show bank ledger', 'Show cash flow'],
        ];
    }

    private function tax(array $result): array
    {
        return [
            'ok' => true,
            'answer_type' => 'tax_summary',
            'message' => 'Here is your tax summary.',
            'cards' => [
                ['label' => 'Tax Collected', 'value' => $result['tax_collected'] ?? 0, 'format' => 'money'],
                ['label' => 'Tax Paid', 'value' => $result['tax_paid'] ?? 0, 'format' => 'money'],
                ['label' => 'Tax Payable', 'value' => $result['tax_payable'] ?? 0, 'format' => 'money'],
            ],
            'tables' => [[
                'title' => 'Tax Accounts',
                'columns' => [
                    ['key' => 'account', 'label' => 'Account'],
                    ['key' => 'tax_collected', 'label' => 'Collected', 'format' => 'money'],
                    ['key' => 'tax_paid', 'label' => 'Paid', 'format' => 'money'],
                    ['key' => 'balance', 'label' => 'Balance', 'format' => 'money'],
                ],
                'rows' => $result['rows'] ?? [],
            ]],
            'warnings' => [],
            'source_note' => $result['source_summary'] ?? 'Based on posted journal entries.',
            'followups' => ['Show Profit & Loss', 'Show tax ledger'],
        ];
    }

    private function ledger(array $result): array
    {
        return [
            'ok' => true,
            'answer_type' => 'ledger',
            'message' => 'Here is the ledger for ' . ($result['entity'] ?? 'the selected account') . '.',
            'cards' => [
                ['label' => 'Total Debit', 'value' => $result['total_debit'] ?? 0, 'format' => 'money'],
                ['label' => 'Total Credit', 'value' => $result['total_credit'] ?? 0, 'format' => 'money'],
                ['label' => 'Closing Balance', 'value' => $result['closing_balance'] ?? 0, 'format' => 'money'],
            ],
            'tables' => [[
                'title' => 'Ledger Lines',
                'columns' => [
                    ['key' => 'date', 'label' => 'Date'],
                    ['key' => 'voucher', 'label' => 'Voucher'],
                    ['key' => 'description', 'label' => 'Description'],
                    ['key' => 'debit', 'label' => 'Debit', 'format' => 'money'],
                    ['key' => 'credit', 'label' => 'Credit', 'format' => 'money'],
                    ['key' => 'running_balance', 'label' => 'Balance', 'format' => 'money'],
                ],
                'rows' => $result['lines'] ?? [],
            ]],
            'warnings' => [],
            'source_note' => $result['source_summary'] ?? 'Based on posted journal entries.',
            'followups' => ['Show related transactions', 'Show account balance'],
        ];
    }

    private function contactBalance(array $result, string $title, string $partyKey): array
    {
        return [
            'ok' => true,
            'answer_type' => mb_strtolower($title),
            'message' => "{$title} total " . $this->money($result['total'] ?? 0) . '.',
            'cards' => [
                ['label' => $title, 'value' => $result['total'] ?? 0, 'format' => 'money'],
                ['label' => 'Parties', 'value' => count($result['rows'] ?? []), 'format' => 'number'],
            ],
            'tables' => [[
                'title' => $title,
                'columns' => [
                    ['key' => $partyKey, 'label' => ucfirst($partyKey)],
                    ['key' => 'debit', 'label' => 'Debit', 'format' => 'money'],
                    ['key' => 'credit', 'label' => 'Credit', 'format' => 'money'],
                    ['key' => 'outstanding', 'label' => 'Outstanding', 'format' => 'money'],
                ],
                'rows' => $result['rows'] ?? [],
            ]],
            'warnings' => [],
            'source_note' => $result['source_summary'] ?? 'Based on posted journal entries.',
            'followups' => $partyKey === 'customer'
                ? ['Show customer ledger', 'Show overdue invoices']
                : ['Show supplier ledger', 'Show unpaid purchase bills'],
        ];
    }

    private function generic(string $intent, array $result): array
    {
        return [
            'ok' => true,
            'answer_type' => $intent,
            'message' => 'I prepared the requested summary.',
            'cards' => [],
            'tables' => [],
            'warnings' => [],
            'source_note' => $result['source_summary'] ?? null,
            'followups' => [],
        ];
    }

    private function amountColumns(): array
    {
        return [['key' => 'account', 'label' => 'Account'], ['key' => 'amount', 'label' => 'Amount', 'format' => 'money']];
    }

    private function money(mixed $value): string
    {
        return 'NPR ' . number_format((float) $value, 2);
    }
}
