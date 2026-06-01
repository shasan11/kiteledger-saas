<?php

namespace App\Services\AI\Tools\Queries;

use App\Services\AI\Tools\AiToolResult;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class BankAccountQueryTool extends BaseQueryTool
{
    public function mostTransactions(Request $request): array
    {
        return $this->movement($request, 'bank_account.most_transactions', 'Bank account with most transactions', 'transaction_count', 'desc');
    }

    public function highestDebitMovement(Request $request): array
    {
        return $this->movement($request, 'bank_account.highest_debit_movement', 'Bank account with highest debit movement', 'debit_total', 'desc');
    }

    public function highestCreditMovement(Request $request): array
    {
        return $this->movement($request, 'bank_account.highest_credit_movement', 'Bank account with highest credit movement', 'credit_total', 'desc');
    }

    public function highestNetMovement(Request $request): array
    {
        return $this->movement($request, 'bank_account.highest_net_movement', 'Bank account with highest net movement', 'net_movement_abs', 'desc');
    }

    public function balanceSummary(Request $request): array
    {
        return $this->movement($request, 'bank_account.balance_summary', 'Bank account balance summary', 'net_movement_abs', 'desc', 10);
    }

    public function recentTransactions(Request $request): array
    {
        $this->authorize($request);

        if (!$this->tableExists(['bank_accounts', 'journal_voucher_lines', 'journal_vouchers'])) {
            return $this->empty('bank_account.recent_transactions', 'Recent bank account transactions', $request);
        }

        $query = DB::table('journal_voucher_lines')
            ->join('journal_vouchers', 'journal_vouchers.id', '=', 'journal_voucher_lines.journal_voucher_id')
            ->join('bank_accounts', function ($join) {
                $join->on('bank_accounts.account_id', '=', 'journal_voucher_lines.account_id');
                if (Schema::hasColumn('journal_voucher_lines', 'chart_of_account_id')) {
                    $join->orOn('bank_accounts.account_id', '=', 'journal_voucher_lines.chart_of_account_id');
                }
            })
            ->select([
                'journal_vouchers.id',
                'journal_vouchers.voucher_no',
                'journal_vouchers.voucher_date',
                'bank_accounts.id as bank_account_id',
                'bank_accounts.display_name as bank_account_name',
                'journal_voucher_lines.debit',
                'journal_voucher_lines.credit',
            ]);

        $this->applyApprovedFinancialTruth($query, 'journal_vouchers');
        $this->applyBranch($query, $request, 'journal_vouchers');
        $this->applyFiscalYear($query, $request, 'journal_vouchers', 'voucher_date');

        $records = $query
            ->orderByDesc('journal_vouchers.voucher_date')
            ->limit(20)
            ->get()
            ->map(fn ($row) => [
                'id' => (string) $row->id,
                'voucher_no' => $row->voucher_no,
                'voucher_date' => $row->voucher_date,
                'bank_account_id' => (string) $row->bank_account_id,
                'bank_account_name' => $row->bank_account_name,
                'debit' => $this->number($row->debit),
                'credit' => $this->number($row->credit),
                'open_url' => '/accounting/journal-vouchers/' . $row->id,
            ])
            ->all();

        return AiToolResult::query('bank_account.recent_transactions', 'Recent bank account transactions', $records, $this->contextFilters($request), count($records) ? 'Recent approved bank account transactions are listed below.' : 'No approved bank account transactions were found.', '/accounting/bank-accounts')->toArray();
    }

    private function movement(Request $request, string $tool, string $title, string $sortColumn, string $direction, int $limit = 5): array
    {
        $this->authorize($request);

        if (!$this->tableExists(['bank_accounts', 'journal_voucher_lines', 'journal_vouchers'])) {
            return $this->empty($tool, $title, $request);
        }

        $query = DB::table('bank_accounts')
            ->leftJoin('journal_voucher_lines', function ($join) {
                $join->on('journal_voucher_lines.account_id', '=', 'bank_accounts.account_id');
                if (Schema::hasColumn('journal_voucher_lines', 'chart_of_account_id')) {
                    $join->orOn('journal_voucher_lines.chart_of_account_id', '=', 'bank_accounts.account_id');
                }
            })
            ->leftJoin('journal_vouchers', 'journal_vouchers.id', '=', 'journal_voucher_lines.journal_voucher_id')
            ->select([
                'bank_accounts.id as bank_account_id',
                'bank_accounts.display_name as bank_account_name',
                'bank_accounts.account_id',
                DB::raw('COUNT(DISTINCT journal_vouchers.id) as transaction_count'),
                DB::raw('COALESCE(SUM(journal_voucher_lines.debit), 0) as debit_total'),
                DB::raw('COALESCE(SUM(journal_voucher_lines.credit), 0) as credit_total'),
                DB::raw('COALESCE(SUM(journal_voucher_lines.debit), 0) - COALESCE(SUM(journal_voucher_lines.credit), 0) as net_movement'),
                DB::raw('ABS(COALESCE(SUM(journal_voucher_lines.debit), 0) - COALESCE(SUM(journal_voucher_lines.credit), 0)) as net_movement_abs'),
            ])
            ->groupBy('bank_accounts.id', 'bank_accounts.display_name', 'bank_accounts.account_id');

        $this->applyActive($query, 'bank_accounts');
        $this->applyBranch($query, $request, 'bank_accounts');
        $this->applyApprovedFinancialTruth($query, 'journal_vouchers');
        $this->applyBranch($query, $request, 'journal_vouchers');
        $this->applyFiscalYear($query, $request, 'journal_vouchers', 'voucher_date');

        $rows = $query
            ->orderBy($sortColumn, $direction)
            ->limit($limit)
            ->get();

        $records = $rows->map(fn ($row) => [
            'bank_account_id' => (string) $row->bank_account_id,
            'bank_account_name' => $row->bank_account_name,
            'account_id' => $row->account_id ? (string) $row->account_id : null,
            'transaction_count' => (int) $row->transaction_count,
            'debit_total' => $this->number($row->debit_total),
            'credit_total' => $this->number($row->credit_total),
            'net_movement' => $this->number($row->net_movement),
            'open_url' => '/accounting/bank-accounts/' . $row->bank_account_id,
        ])->all();

        if (!$records || (int) ($records[0]['transaction_count'] ?? 0) === 0) {
            return $this->empty($tool, $title, $request, ['approved' => true, 'void' => false], 'No approved bank account journal entries were found.');
        }

        $top = $records[0];
        $summary = $top['bank_account_name'] . ' has the most transactions with ' . $top['transaction_count'] . ' approved journal entries.';
        if ($tool !== 'bank_account.most_transactions') {
            $metric = str_replace(['bank_account.', '_'], ['', ' '], $tool);
            $summary = $top['bank_account_name'] . ' has the highest ' . $metric . '.';
        }

        return AiToolResult::query($tool, $title, $records, array_merge($this->contextFilters($request), [
            'approved' => true,
            'void' => false,
            'active' => true,
        ]), $summary, $top['open_url'])->toArray();
    }
}
