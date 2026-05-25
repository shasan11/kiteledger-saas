<?php

namespace App\Services\Reports;

use App\Models\ChartOfAccount;
use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AccountingReportService extends BaseReportService
{
    public function build(string $reportKey, array $filters, array $meta): array
    {
        return match ($reportKey) {
            'transaction-list' => $this->transactionList($reportKey, $filters, $meta),
            'journal-report' => $this->journalReport($reportKey, $filters, $meta),
            'general-ledger-summary' => $this->generalLedgerSummary($reportKey, $filters, $meta),
            'detail-general-ledger' => $this->detailGeneralLedger($reportKey, $filters, $meta),
            'gl-master' => $this->glMaster($reportKey, $filters, $meta),
            'trial-balance' => $this->trialBalance($reportKey, $filters, $meta),
            'income-statement' => $this->incomeStatement($reportKey, $filters, $meta),
            'balance-sheet' => $this->balanceSheet($reportKey, $filters, $meta),
            'cash-flow-summary' => $this->cashFlowSummary($reportKey, $filters, $meta),
            default => throw new \InvalidArgumentException('Unsupported accounting report.'),
        };
    }

    protected function baseQuery(array $filters)
    {
        $query = JournalVoucherLine::query()
            ->select('journal_voucher_lines.*')
            ->join('journal_vouchers', 'journal_vouchers.id', '=', 'journal_voucher_lines.journal_voucher_id')
            ->leftJoin('chart_of_accounts', 'chart_of_accounts.id', '=', 'journal_voucher_lines.chart_of_account_id')
            ->leftJoin('branches', 'branches.id', '=', 'journal_vouchers.branch_id');

        $this->applyBranchFilter($query, $filters, 'journal_vouchers.branch_id');
        $this->applyStatusApprovalFilters($query, $filters);

        return $query;
    }

    protected function transactionList(string $reportKey, array $filters, array $meta): array
    {
        $query = $this->baseQuery($filters)
            ->whereBetween('journal_vouchers.voucher_date', [$filters['date_from'], $filters['date_to']]);

        if (!empty($filters['chart_of_account_id'])) {
            $query->where('journal_voucher_lines.chart_of_account_id', $filters['chart_of_account_id']);
        }

        if (!empty($filters['search'])) {
            $query->where(function ($builder) use ($filters) {
                $builder
                    ->where('journal_vouchers.voucher_no', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('journal_vouchers.reference', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('journal_voucher_lines.description', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('chart_of_accounts.name', 'like', '%' . $filters['search'] . '%');
            });
        }

        if ($filters['debit_credit'] === 'debit') {
            $query->where('journal_voucher_lines.debit', '>', 0);
        } elseif ($filters['debit_credit'] === 'credit') {
            $query->where('journal_voucher_lines.credit', '>', 0);
        }

        $rows = $query
            ->orderBy('journal_vouchers.voucher_date')
            ->orderBy('journal_vouchers.voucher_no')
            ->get([
                'journal_vouchers.voucher_date',
                'journal_vouchers.voucher_no',
                'journal_vouchers.reference',
                'journal_vouchers.status',
                'journal_vouchers.approved',
                'chart_of_accounts.code as account_code',
                'chart_of_accounts.name as account_name',
                'branches.name as branch_name',
                'journal_voucher_lines.description',
                'journal_voucher_lines.debit',
                'journal_voucher_lines.credit',
            ])
            ->map(fn ($row) => [
                'date' => $row->voucher_date?->format('Y-m-d'),
                'voucher_no' => $row->voucher_no,
                'reference' => $row->reference,
                'account_code' => $row->account_code,
                'account_name' => $row->account_name,
                'description' => $row->description,
                'debit' => $this->toFloat($row->debit),
                'credit' => $this->toFloat($row->credit),
                'branch' => $row->branch_name,
                'status' => $row->status,
                'approval' => $row->approved ? 'Approved' : 'Pending',
            ])
            ->values()
            ->all();

        return $this->response(
            $meta['title'],
            $meta['category_label'],
            $reportKey,
            $filters,
            [
                ['title' => 'Date', 'key' => 'date'],
                ['title' => 'Voucher No', 'key' => 'voucher_no'],
                ['title' => 'Reference', 'key' => 'reference'],
                ['title' => 'Account Code', 'key' => 'account_code'],
                ['title' => 'Account Name', 'key' => 'account_name'],
                ['title' => 'Description', 'key' => 'description'],
                ['title' => 'Debit', 'key' => 'debit'],
                ['title' => 'Credit', 'key' => 'credit'],
                ['title' => 'Branch', 'key' => 'branch'],
                ['title' => 'Status', 'key' => 'status'],
                ['title' => 'Approval', 'key' => 'approval'],
            ],
            $rows,
            [
                ['label' => 'Total Debit', 'value' => $this->total($rows, 'debit')],
                ['label' => 'Total Credit', 'value' => $this->total($rows, 'credit')],
            ],
            [
                'debit' => $this->total($rows, 'debit'),
                'credit' => $this->total($rows, 'credit'),
            ],
        );
    }

    protected function journalReport(string $reportKey, array $filters, array $meta): array
    {
        $query = JournalVoucher::query()
            ->with(['lines.chartOfAccount', 'branch'])
            ->whereBetween('voucher_date', [$filters['date_from'], $filters['date_to']]);

        $this->applyBranchFilter($query, $filters);
        $this->applyStatusApprovalFilters($query, $filters);

        if (!empty($filters['voucher_no'])) {
            $query->where('voucher_no', 'like', '%' . $filters['voucher_no'] . '%');
        }

        $rows = $query->orderBy('voucher_date')->get()->flatMap(function ($voucher) {
            return $voucher->lines->map(fn ($line) => [
                'voucher_date' => $voucher->voucher_date?->format('Y-m-d'),
                'voucher_no' => $voucher->voucher_no,
                'reference' => $voucher->reference,
                'narration' => $voucher->narration,
                'account' => trim(($line->chartOfAccount?->code ? $line->chartOfAccount->code . ' - ' : '') . ($line->chartOfAccount?->name ?? '')),
                'description' => $line->description,
                'debit' => $this->toFloat($line->debit),
                'credit' => $this->toFloat($line->credit),
                'status' => $voucher->status,
            ]);
        })->values()->all();

        $totalDebit = $this->total($rows, 'debit');
        $totalCredit = $this->total($rows, 'credit');

        return $this->response(
            $meta['title'],
            $meta['category_label'],
            $reportKey,
            $filters,
            [
                ['title' => 'Voucher Date', 'key' => 'voucher_date'],
                ['title' => 'Voucher No', 'key' => 'voucher_no'],
                ['title' => 'Reference', 'key' => 'reference'],
                ['title' => 'Narration', 'key' => 'narration'],
                ['title' => 'Account', 'key' => 'account'],
                ['title' => 'Description', 'key' => 'description'],
                ['title' => 'Debit', 'key' => 'debit'],
                ['title' => 'Credit', 'key' => 'credit'],
                ['title' => 'Status', 'key' => 'status'],
            ],
            $rows,
            [
                ['label' => 'Total Debit', 'value' => $totalDebit],
                ['label' => 'Total Credit', 'value' => $totalCredit],
                ['label' => 'Difference', 'value' => round($totalDebit - $totalCredit, 2)],
            ],
            [
                'debit' => $totalDebit,
                'credit' => $totalCredit,
                'difference' => round($totalDebit - $totalCredit, 2),
            ],
        );
    }

    protected function generalLedgerSummary(string $reportKey, array $filters, array $meta): array
    {
        $accounts = ChartOfAccount::query()
            ->with(['branch'])
            ->when(!empty($filters['account_type']), fn ($query) => $query->where('type', $filters['account_type']))
            ->when(!$filters['include_inactive'], fn ($query) => $query->where('active', true))
            ->orderBy('code')
            ->get();

        $rows = $accounts->map(function ($account) use ($filters) {
            $opening = $this->ledgerBalance($account->id, null, Carbon::parse($filters['date_from'])->subDay()->toDateString(), $filters);
            $period = $this->ledgerMovement($account->id, $filters['date_from'], $filters['date_to'], $filters);
            $closing = round($opening + $period['debit'] - $period['credit'], 2);

            return [
                'account_code' => $account->code,
                'account_name' => $account->name,
                'opening_balance' => $opening,
                'debit' => $period['debit'],
                'credit' => $period['credit'],
                'closing_balance' => $closing,
            ];
        })->filter(fn ($row) => $filters['include_zero_balance'] || abs($row['opening_balance']) > 0.0001 || abs($row['closing_balance']) > 0.0001 || abs($row['debit']) > 0.0001 || abs($row['credit']) > 0.0001)
            ->values()
            ->all();

        return $this->response(
            $meta['title'],
            $meta['category_label'],
            $reportKey,
            $filters,
            [
                ['title' => 'Account Code', 'key' => 'account_code'],
                ['title' => 'Account Name', 'key' => 'account_name'],
                ['title' => 'Opening Balance', 'key' => 'opening_balance'],
                ['title' => 'Debit', 'key' => 'debit'],
                ['title' => 'Credit', 'key' => 'credit'],
                ['title' => 'Closing Balance', 'key' => 'closing_balance'],
            ],
            $rows,
            [],
            [
                'opening_balance' => $this->total($rows, 'opening_balance'),
                'debit' => $this->total($rows, 'debit'),
                'credit' => $this->total($rows, 'credit'),
                'closing_balance' => $this->total($rows, 'closing_balance'),
            ],
        );
    }

    protected function detailGeneralLedger(string $reportKey, array $filters, array $meta): array
    {
        $account = ChartOfAccount::query()->find($filters['chart_of_account_id']);
        $opening = $account ? $this->ledgerBalance($account->id, null, Carbon::parse($filters['date_from'])->subDay()->toDateString(), $filters) : 0;

        $running = $opening;
        $rows = $account
            ? $this->baseQuery($filters)
                ->where('journal_voucher_lines.chart_of_account_id', $account->id)
                ->whereBetween('journal_vouchers.voucher_date', [$filters['date_from'], $filters['date_to']])
                ->orderBy('journal_vouchers.voucher_date')
                ->orderBy('journal_vouchers.voucher_no')
                ->get([
                    'journal_vouchers.voucher_date',
                    'journal_vouchers.voucher_no',
                    'journal_vouchers.reference',
                    'journal_voucher_lines.description',
                    'journal_voucher_lines.debit',
                    'journal_voucher_lines.credit',
                ])
                ->map(function ($line) use (&$running) {
                    $running += $this->toFloat($line->debit) - $this->toFloat($line->credit);

                    return [
                        'date' => $line->voucher_date?->format('Y-m-d'),
                        'voucher_no' => $line->voucher_no,
                        'reference' => $line->reference,
                        'description' => $line->description,
                        'debit' => $this->toFloat($line->debit),
                        'credit' => $this->toFloat($line->credit),
                        'running_balance' => round($running, 2),
                    ];
                })
                ->values()
                ->all()
            : [];

        if ($filters['include_opening']) {
            array_unshift($rows, [
                'date' => $filters['date_from'],
                'voucher_no' => 'OPENING',
                'reference' => null,
                'description' => 'Opening Balance',
                'debit' => null,
                'credit' => null,
                'running_balance' => $opening,
            ]);
        }

        return $this->response(
            $meta['title'],
            $meta['category_label'],
            $reportKey,
            $filters,
            [
                ['title' => 'Date', 'key' => 'date'],
                ['title' => 'Voucher No', 'key' => 'voucher_no'],
                ['title' => 'Reference', 'key' => 'reference'],
                ['title' => 'Description', 'key' => 'description'],
                ['title' => 'Debit', 'key' => 'debit'],
                ['title' => 'Credit', 'key' => 'credit'],
                ['title' => 'Running Balance', 'key' => 'running_balance'],
            ],
            $rows,
            $account ? [['label' => 'Account', 'value' => trim(($account->code ? $account->code . ' - ' : '') . $account->name)]] : [],
            [
                'debit' => $this->total($rows, 'debit'),
                'credit' => $this->total($rows, 'credit'),
                'running_balance' => collect($rows)->last()['running_balance'] ?? $opening,
            ],
        );
    }

    protected function glMaster(string $reportKey, array $filters, array $meta): array
    {
        $rows = ChartOfAccount::query()
            ->with(['parent', 'branch'])
            ->when(!empty($filters['account_type']), fn ($query) => $query->where('type', $filters['account_type']))
            ->when($filters['active'] !== null && $filters['active'] !== '', fn ($query) => $query->where('active', filter_var($filters['active'], FILTER_VALIDATE_BOOL)))
            ->when($filters['is_system_generated'] !== null && $filters['is_system_generated'] !== '', fn ($query) => $query->where('is_system_generated', filter_var($filters['is_system_generated'], FILTER_VALIDATE_BOOL)))
            ->orderBy('code')
            ->get()
            ->map(fn ($account) => [
                'account_code' => $account->code,
                'account_name' => $account->name,
                'type' => $account->type,
                'parent_account' => $account->parent?->name,
                'branch' => $account->branch?->name,
                'status' => $account->active ? 'Active' : 'Inactive',
            ])
            ->values()
            ->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Account Code', 'key' => 'account_code'],
            ['title' => 'Account Name', 'key' => 'account_name'],
            ['title' => 'Type', 'key' => 'type'],
            ['title' => 'Parent Account', 'key' => 'parent_account'],
            ['title' => 'Branch', 'key' => 'branch'],
            ['title' => 'Status', 'key' => 'status'],
        ], $rows);
    }

    protected function trialBalance(string $reportKey, array $filters, array $meta): array
    {
        $accounts = ChartOfAccount::query()->orderBy('code')->get();
        $rows = $accounts->map(function ($account) use ($filters) {
            $balance = $this->ledgerBalance($account->id, null, $filters['as_of_date'], $filters);

            return [
                'account_code' => $account->code,
                'account_name' => $account->name,
                'debit_balance' => $balance >= 0 ? round($balance, 2) : 0,
                'credit_balance' => $balance < 0 ? round(abs($balance), 2) : 0,
            ];
        })->filter(fn ($row) => $filters['include_zero_balance'] || $row['debit_balance'] || $row['credit_balance'])
            ->values()
            ->all();

        $totalDebit = $this->total($rows, 'debit_balance');
        $totalCredit = $this->total($rows, 'credit_balance');

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Account Code', 'key' => 'account_code'],
            ['title' => 'Account Name', 'key' => 'account_name'],
            ['title' => 'Debit Balance', 'key' => 'debit_balance'],
            ['title' => 'Credit Balance', 'key' => 'credit_balance'],
        ], $rows, [
            ['label' => 'Total Debit', 'value' => $totalDebit],
            ['label' => 'Total Credit', 'value' => $totalCredit],
            ['label' => 'Difference', 'value' => round($totalDebit - $totalCredit, 2)],
        ], [
            'debit_balance' => $totalDebit,
            'credit_balance' => $totalCredit,
            'difference' => round($totalDebit - $totalCredit, 2),
        ]);
    }

    protected function incomeStatement(string $reportKey, array $filters, array $meta): array
    {
        $rows = ChartOfAccount::query()
            ->whereIn('type', ['income', 'expense'])
            ->orderBy('type')
            ->orderBy('code')
            ->get()
            ->map(function ($account) use ($filters) {
                $movement = $this->ledgerMovement($account->id, $filters['date_from'], $filters['date_to'], $filters);
                $amount = $account->type === 'income'
                    ? round($movement['credit'] - $movement['debit'], 2)
                    : round($movement['debit'] - $movement['credit'], 2);

                return [
                    'section' => ucfirst($account->type),
                    'account_code' => $account->code,
                    'account_name' => $account->name,
                    'amount' => $amount,
                ];
            })
            ->filter(fn ($row) => abs($row['amount']) > 0.0001)
            ->values()
            ->all();

        $income = collect($rows)->where('section', 'Income')->sum('amount');
        $expense = collect($rows)->where('section', 'Expense')->sum('amount');

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Section', 'key' => 'section'],
            ['title' => 'Account Code', 'key' => 'account_code'],
            ['title' => 'Account Name', 'key' => 'account_name'],
            ['title' => 'Amount', 'key' => 'amount'],
        ], $rows, [
            ['label' => 'Total Income', 'value' => round($income, 2)],
            ['label' => 'Total Expense', 'value' => round($expense, 2)],
            ['label' => 'Net Profit/Loss', 'value' => round($income - $expense, 2)],
        ], [
            'income' => round($income, 2),
            'expense' => round($expense, 2),
            'net_profit_loss' => round($income - $expense, 2),
        ]);
    }

    protected function balanceSheet(string $reportKey, array $filters, array $meta): array
    {
        $rows = ChartOfAccount::query()
            ->whereIn('type', ['asset', 'liability', 'equity'])
            ->orderBy('type')
            ->orderBy('code')
            ->get()
            ->map(function ($account) use ($filters) {
                return [
                    'section' => ucfirst($account->type),
                    'account_code' => $account->code,
                    'account_name' => $account->name,
                    'balance' => $this->ledgerBalance($account->id, null, $filters['as_of_date'], $filters),
                ];
            })
            ->filter(fn ($row) => abs($row['balance']) > 0.0001)
            ->values()
            ->all();

        $asset = collect($rows)->where('section', 'Asset')->sum('balance');
        $liability = collect($rows)->where('section', 'Liability')->sum('balance');
        $equity = collect($rows)->where('section', 'Equity')->sum('balance');

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Section', 'key' => 'section'],
            ['title' => 'Account Code', 'key' => 'account_code'],
            ['title' => 'Account Name', 'key' => 'account_name'],
            ['title' => 'Balance', 'key' => 'balance'],
        ], $rows, [
            ['label' => 'Total Assets', 'value' => round($asset, 2)],
            ['label' => 'Total Liabilities', 'value' => round($liability, 2)],
            ['label' => 'Total Equity', 'value' => round($equity, 2)],
        ], [
            'asset' => round($asset, 2),
            'liability' => round($liability, 2),
            'equity' => round($equity, 2),
        ]);
    }

    protected function cashFlowSummary(string $reportKey, array $filters, array $meta): array
    {
        try {
            $cashAccounts = ChartOfAccount::query()
                ->whereHas('account', fn ($query) => $query->whereIn('nature', ['cash', 'bank']))
                ->get();
        } catch (\Throwable) {
            $cashAccounts = ChartOfAccount::query()
                ->where('type', 'asset')
                ->where(fn ($q) => $q->where('name', 'like', '%cash%')->orWhere('name', 'like', '%bank%'))
                ->get();
        }

        $opening = 0.0;
        $inflow = 0.0;
        $outflow = 0.0;
        $rows = [];

        foreach ($cashAccounts as $account) {
            $accountOpening = $this->ledgerBalance($account->id, null, Carbon::parse($filters['date_from'])->subDay()->toDateString(), $filters);
            $movement = $this->ledgerMovement($account->id, $filters['date_from'], $filters['date_to'], $filters);
            $opening += $accountOpening;
            $inflow += $movement['debit'];
            $outflow += $movement['credit'];
            $rows[] = [
                'account_code' => $account->code,
                'account_name' => $account->name,
                'opening_balance' => round($accountOpening, 2),
                'cash_inflow' => round($movement['debit'], 2),
                'cash_outflow' => round($movement['credit'], 2),
                'closing_balance' => round($accountOpening + $movement['debit'] - $movement['credit'], 2),
            ];
        }

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Account Code', 'key' => 'account_code'],
            ['title' => 'Account Name', 'key' => 'account_name'],
            ['title' => 'Opening Cash/Bank', 'key' => 'opening_balance'],
            ['title' => 'Cash Inflow', 'key' => 'cash_inflow'],
            ['title' => 'Cash Outflow', 'key' => 'cash_outflow'],
            ['title' => 'Closing Cash/Bank', 'key' => 'closing_balance'],
        ], $rows, [
            ['label' => 'Opening Cash/Bank', 'value' => round($opening, 2)],
            ['label' => 'Cash Inflow', 'value' => round($inflow, 2)],
            ['label' => 'Cash Outflow', 'value' => round($outflow, 2)],
            ['label' => 'Closing Cash/Bank', 'value' => round($opening + $inflow - $outflow, 2)],
        ], [
            'opening_balance' => round($opening, 2),
            'cash_inflow' => round($inflow, 2),
            'cash_outflow' => round($outflow, 2),
            'closing_balance' => round($opening + $inflow - $outflow, 2),
        ]);
    }

    protected function ledgerMovement(string $chartOfAccountId, ?string $from, ?string $to, array $filters): array
    {
        $query = $this->baseQuery($filters)
            ->where('journal_voucher_lines.chart_of_account_id', $chartOfAccountId);

        if ($from && $to) {
            $query->whereBetween('journal_vouchers.voucher_date', [$from, $to]);
        } elseif ($to) {
            $query->where('journal_vouchers.voucher_date', '<=', $to);
        }

        $result = $query
            ->selectRaw('COALESCE(SUM(journal_voucher_lines.debit), 0) as debit, COALESCE(SUM(journal_voucher_lines.credit), 0) as credit')
            ->first();

        return [
            'debit' => $this->toFloat($result?->debit),
            'credit' => $this->toFloat($result?->credit),
        ];
    }

    protected function ledgerBalance(string $chartOfAccountId, ?string $from, ?string $to, array $filters): float
    {
        $movement = $this->ledgerMovement($chartOfAccountId, $from, $to, $filters);

        return round($movement['debit'] - $movement['credit'], 2);
    }
}
