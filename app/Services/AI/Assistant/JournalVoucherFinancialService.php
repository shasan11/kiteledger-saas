<?php

namespace App\Services\AI\Assistant;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class JournalVoucherFinancialService
{
    public function __construct(private readonly AiAccountingContextService $context) {}

    public function incomeExpenseSummary(Request $request, array $filters): array
    {
        $rows = $this->accountTotalsQuery($request, $filters)
            ->where(function ($query) {
                $query->where('chart_of_accounts.type', 'like', '%income%')
                    ->orWhere('chart_of_accounts.type', 'like', '%revenue%')
                    ->orWhere('chart_of_accounts.type', 'like', '%expense%');
            })
            ->groupBy('chart_of_accounts.id', 'chart_of_accounts.name', 'chart_of_accounts.code', 'chart_of_accounts.type')
            ->orderByDesc(DB::raw('ABS(SUM(journal_voucher_lines.debit) - SUM(journal_voucher_lines.credit))'))
            ->limit(AiAssistantGuard::TABLE_MAX_ROWS)
            ->get();

        $incomeAccounts = [];
        $expenseAccounts = [];
        $totalIncome = 0.0;
        $totalExpense = 0.0;

        foreach ($rows as $row) {
            $type = mb_strtolower((string) $row->account_type);
            $amount = str_contains($type, 'expense')
                ? max(0, (float) $row->debit_total - (float) $row->credit_total)
                : max(0, (float) $row->credit_total - (float) $row->debit_total);

            $entry = [
                'account' => $row->account_name,
                'type' => $this->accountTypeLabel($row->account_type),
                'amount' => round($amount, 2),
            ];

            if (str_contains($type, 'expense')) {
                $totalExpense += $amount;
                $expenseAccounts[] = $entry;
            } else {
                $totalIncome += $amount;
                $incomeAccounts[] = $entry;
            }
        }

        return [
            'total_income' => round($totalIncome, 2),
            'total_expense' => round($totalExpense, 2),
            'gross_profit' => round($totalIncome - $totalExpense, 2),
            'net_profit' => round($totalIncome - $totalExpense, 2),
            'income_accounts' => $incomeAccounts,
            'expense_accounts' => $expenseAccounts,
            'source_summary' => $this->sourceSummary($filters),
        ];
    }

    public function trialBalance(Request $request, array $filters): array
    {
        $rows = $this->accountTotalsQuery($request, $filters)
            ->groupBy('chart_of_accounts.id', 'chart_of_accounts.name', 'chart_of_accounts.code', 'chart_of_accounts.type')
            ->orderBy('chart_of_accounts.code')
            ->limit(AiAssistantGuard::TABLE_MAX_ROWS)
            ->get()
            ->map(fn ($row) => [
                'account' => $row->account_name,
                'type' => $this->accountTypeLabel($row->account_type),
                'debit' => round((float) $row->debit_total, 2),
                'credit' => round((float) $row->credit_total, 2),
                'balance' => round((float) $row->debit_total - (float) $row->credit_total, 2),
            ])
            ->all();

        return [
            'rows' => $rows,
            'total_debit' => round(array_sum(array_column($rows, 'debit')), 2),
            'total_credit' => round(array_sum(array_column($rows, 'credit')), 2),
            'source_summary' => $this->sourceSummary($filters),
        ];
    }

    public function balanceSheet(Request $request, array $filters): array
    {
        $rows = $this->accountTotalsQuery($request, $filters)
            ->where(function ($query) {
                $query->where('chart_of_accounts.type', 'like', '%asset%')
                    ->orWhere('chart_of_accounts.type', 'like', '%liability%')
                    ->orWhere('chart_of_accounts.type', 'like', '%equity%')
                    ->orWhere('chart_of_accounts.type', 'like', '%capital%');
            })
            ->groupBy('chart_of_accounts.id', 'chart_of_accounts.name', 'chart_of_accounts.code', 'chart_of_accounts.type')
            ->limit(AiAssistantGuard::TABLE_MAX_ROWS)
            ->get();

        $sections = ['assets' => [], 'liabilities' => [], 'equity' => []];
        $totals = ['assets' => 0.0, 'liabilities' => 0.0, 'equity' => 0.0];

        foreach ($rows as $row) {
            $type = mb_strtolower((string) $row->account_type);
            $section = str_contains($type, 'asset') ? 'assets' : (str_contains($type, 'liability') ? 'liabilities' : 'equity');
            $balance = $section === 'assets'
                ? (float) $row->debit_total - (float) $row->credit_total
                : (float) $row->credit_total - (float) $row->debit_total;
            $sections[$section][] = ['account' => $row->account_name, 'amount' => round($balance, 2)];
            $totals[$section] += $balance;
        }

        return [
            'assets' => $sections['assets'],
            'liabilities' => $sections['liabilities'],
            'equity' => $sections['equity'],
            'total_assets' => round($totals['assets'], 2),
            'total_liabilities' => round($totals['liabilities'], 2),
            'total_equity' => round($totals['equity'], 2),
            'source_summary' => $this->sourceSummary($filters),
        ];
    }

    public function cashBankSummary(Request $request, array $filters): array
    {
        $rows = $this->accountTotalsQuery($request, $filters)
            ->where(function ($query) {
                $query->where('chart_of_accounts.name', 'like', '%cash%')
                    ->orWhere('chart_of_accounts.name', 'like', '%bank%')
                    ->orWhere('chart_of_accounts.code', 'like', '%cash%')
                    ->orWhere('chart_of_accounts.code', 'like', '%bank%');
            })
            ->groupBy('chart_of_accounts.id', 'chart_of_accounts.name', 'chart_of_accounts.code', 'chart_of_accounts.type')
            ->orderBy('chart_of_accounts.name')
            ->limit(AiAssistantGuard::TABLE_MAX_ROWS)
            ->get()
            ->map(fn ($row) => [
                'account' => $row->account_name,
                'inflow' => round((float) $row->debit_total, 2),
                'outflow' => round((float) $row->credit_total, 2),
                'closing' => round((float) $row->debit_total - (float) $row->credit_total, 2),
            ])
            ->all();

        return [
            'accounts' => $rows,
            'cash_balance' => round(array_sum(array_map(fn ($row) => str_contains(mb_strtolower($row['account']), 'cash') ? $row['closing'] : 0, $rows)), 2),
            'bank_balance' => round(array_sum(array_map(fn ($row) => str_contains(mb_strtolower($row['account']), 'bank') ? $row['closing'] : 0, $rows)), 2),
            'source_summary' => $this->sourceSummary($filters),
        ];
    }

    public function taxSummary(Request $request, array $filters): array
    {
        $rows = $this->accountTotalsQuery($request, $filters)
            ->where(function ($query) {
                $query->where('chart_of_accounts.name', 'like', '%tax%')
                    ->orWhere('chart_of_accounts.name', 'like', '%vat%')
                    ->orWhere('chart_of_accounts.code', 'like', '%tax%')
                    ->orWhere('chart_of_accounts.code', 'like', '%vat%');
            })
            ->groupBy('chart_of_accounts.id', 'chart_of_accounts.name', 'chart_of_accounts.code', 'chart_of_accounts.type')
            ->limit(AiAssistantGuard::TABLE_MAX_ROWS)
            ->get()
            ->map(fn ($row) => [
                'account' => $row->account_name,
                'tax_paid' => round((float) $row->debit_total, 2),
                'tax_collected' => round((float) $row->credit_total, 2),
                'balance' => round((float) $row->credit_total - (float) $row->debit_total, 2),
            ])
            ->all();

        return [
            'rows' => $rows,
            'tax_collected' => round(array_sum(array_column($rows, 'tax_collected')), 2),
            'tax_paid' => round(array_sum(array_column($rows, 'tax_paid')), 2),
            'tax_payable' => round(array_sum(array_column($rows, 'balance')), 2),
            'source_summary' => $this->sourceSummary($filters),
        ];
    }

    public function receivableSummary(Request $request, array $filters): array
    {
        return $this->contactBalanceSummary($request, $filters, 'receivable');
    }

    public function payableSummary(Request $request, array $filters): array
    {
        return $this->contactBalanceSummary($request, $filters, 'payable');
    }

    public function accountLedger(Request $request, array $filters): array
    {
        $query = DB::table('journal_voucher_lines')
            ->join('journal_vouchers', 'journal_vouchers.id', '=', 'journal_voucher_lines.journal_voucher_id')
            ->leftJoin('chart_of_accounts', 'chart_of_accounts.id', '=', 'journal_voucher_lines.chart_of_account_id')
            ->select([
                'journal_vouchers.voucher_date as date',
                'journal_vouchers.voucher_no as voucher',
                'journal_voucher_lines.description',
                'journal_voucher_lines.debit',
                'journal_voucher_lines.credit',
            ])
            ->orderBy('journal_vouchers.voucher_date')
            ->orderBy('journal_vouchers.voucher_no')
            ->limit(AiAssistantGuard::LEDGER_MAX_LINES);

        if (! empty($filters['chart_of_account_id'])) {
            $query->where('journal_voucher_lines.chart_of_account_id', $filters['chart_of_account_id']);
        } elseif (! empty($filters['account_id']) && Schema::hasColumn('journal_voucher_lines', 'account_id')) {
            $query->where('journal_voucher_lines.account_id', $filters['account_id']);
        }

        $this->context->applyVoucherScope($query, $request, $filters);

        $balance = 0.0;
        $lines = $query->get()->map(function ($row) use (&$balance) {
            $balance += (float) $row->debit - (float) $row->credit;

            return [
                'date' => (string) $row->date,
                'voucher' => $row->voucher,
                'description' => $row->description,
                'debit' => round((float) $row->debit, 2),
                'credit' => round((float) $row->credit, 2),
                'running_balance' => round($balance, 2),
            ];
        })->all();

        return [
            'entity' => $filters['entity_label'] ?? 'Ledger',
            'opening_balance' => 0,
            'lines' => $lines,
            'total_debit' => round(array_sum(array_column($lines, 'debit')), 2),
            'total_credit' => round(array_sum(array_column($lines, 'credit')), 2),
            'closing_balance' => round($balance, 2),
            'source_summary' => $this->sourceSummary($filters),
        ];
    }

    public function contactLedger(Request $request, array $filters): array
    {
        return $this->accountLedger($request, $filters);
    }

    private function accountTotalsQuery(Request $request, array $filters)
    {
        $query = DB::table('journal_voucher_lines')
            ->join('journal_vouchers', 'journal_vouchers.id', '=', 'journal_voucher_lines.journal_voucher_id')
            ->join('chart_of_accounts', 'chart_of_accounts.id', '=', 'journal_voucher_lines.chart_of_account_id')
            ->select([
                'chart_of_accounts.id',
                DB::raw("COALESCE(chart_of_accounts.name, chart_of_accounts.code, 'Unnamed account') as account_name"),
                'chart_of_accounts.code',
                'chart_of_accounts.type as account_type',
                DB::raw('COALESCE(SUM(journal_voucher_lines.debit), 0) as debit_total'),
                DB::raw('COALESCE(SUM(journal_voucher_lines.credit), 0) as credit_total'),
            ]);

        return $this->context->applyVoucherScope($query, $request, $filters);
    }

    private function contactBalanceSummary(Request $request, array $filters, string $kind): array
    {
        $accountColumn = $kind === 'payable' ? 'payable_account_id' : 'account_id';
        if (! Schema::hasTable('contacts') || ! Schema::hasColumn('contacts', $accountColumn) || ! Schema::hasColumn('journal_voucher_lines', 'account_id')) {
            return [
                'rows' => [],
                'total' => 0,
                'source_summary' => $this->sourceSummary($filters),
            ];
        }

        $query = DB::table('contacts')
            ->join('journal_voucher_lines', 'journal_voucher_lines.account_id', '=', "contacts.{$accountColumn}")
            ->join('journal_vouchers', 'journal_vouchers.id', '=', 'journal_voucher_lines.journal_voucher_id')
            ->whereNotNull("contacts.{$accountColumn}")
            ->where(function ($query) {
                $query->where('contacts.active', true)->orWhereNull('contacts.active');
            })
            ->select([
                'contacts.name as contact',
                'contacts.code',
                DB::raw('COALESCE(SUM(journal_voucher_lines.debit), 0) as debit_total'),
                DB::raw('COALESCE(SUM(journal_voucher_lines.credit), 0) as credit_total'),
            ])
            ->groupBy('contacts.id', 'contacts.name', 'contacts.code')
            ->limit(AiAssistantGuard::TABLE_MAX_ROWS);

        $this->context->applyVoucherScope($query, $request, $filters);

        $rows = $query->get()
            ->map(function ($row) use ($kind) {
                $outstanding = $kind === 'payable'
                    ? (float) $row->credit_total - (float) $row->debit_total
                    : (float) $row->debit_total - (float) $row->credit_total;

                return [
                    $kind === 'payable' ? 'supplier' : 'customer' => $row->contact,
                    'debit' => round((float) $row->debit_total, 2),
                    'credit' => round((float) $row->credit_total, 2),
                    'outstanding' => round($outstanding, 2),
                ];
            })
            ->filter(fn ($row) => abs((float) $row['outstanding']) > 0.009)
            ->sortByDesc(fn ($row) => abs((float) $row['outstanding']))
            ->values()
            ->all();

        return [
            'rows' => $rows,
            'total' => round(array_sum(array_column($rows, 'outstanding')), 2),
            'source_summary' => $this->sourceSummary($filters),
        ];
    }

    private function accountTypeLabel(?string $type): string
    {
        return ucwords(str_replace('_', ' ', (string) $type));
    }

    private function sourceSummary(array $filters): string
    {
        $range = $filters['date_range'] ?? [];
        if (! empty($range['from']) && ! empty($range['to'])) {
            return "Based on posted journal entries from {$range['from']} to {$range['to']}.";
        }

        return 'Based on posted journal entries.';
    }
}
