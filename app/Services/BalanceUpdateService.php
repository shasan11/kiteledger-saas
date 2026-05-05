<?php

namespace App\Services;

use App\Models\Account;
use App\Models\JournalVoucher;
use Illuminate\Support\Facades\DB;

class BalanceUpdateService
{
    public function applyJournalVoucher(JournalVoucher $journalVoucher): void
    {
        if (!$journalVoucher->approved) {
            return;
        }

        foreach ($journalVoucher->journalVoucherLines as $line) {
            $this->updateAccountBalance($line->chart_of_account_id, $line->debit, $line->credit);
        }
    }

    public function reverseJournalVoucher(JournalVoucher $journalVoucher): void
    {
        foreach ($journalVoucher->journalVoucherLines as $line) {
            $this->updateAccountBalance($line->chart_of_account_id, $line->credit, $line->debit);
        }
    }

    public function recalculateAccount(Account $account): void
    {
        DB::transaction(function () use ($account) {
            $result = DB::table('journal_voucher_lines')
                ->join('journal_vouchers', 'journal_voucher_lines.journal_voucher_id', '=', 'journal_vouchers.id')
                ->where('journal_voucher_lines.chart_of_account_id', $account->id)
                ->where('journal_vouchers.approved', true)
                ->selectRaw('SUM(COALESCE(journal_voucher_lines.debit, 0)) as total_debit, SUM(COALESCE(journal_voucher_lines.credit, 0)) as total_credit')
                ->first();

            $drAmount = (float) ($result?->total_debit ?? 0);
            $crAmount = (float) ($result?->total_credit ?? 0);
            $balance = $drAmount - $crAmount;

            $account->updateQuietly([
                'dr_amount' => $drAmount,
                'cr_amount' => $crAmount,
                'balance' => $balance,
            ]);
        });
    }

    public function recalculateAll(): void
    {
        DB::transaction(function () {
            Account::chunk(100, function ($accounts) {
                foreach ($accounts as $account) {
                    $this->recalculateAccount($account);
                }
            });
        });
    }

    protected function updateAccountBalance(string $accountId, float $debit, float $credit): void
    {
        $account = Account::find($accountId);
        if (!$account) {
            return;
        }

        $account->increment('dr_amount', $debit);
        $account->increment('cr_amount', $credit);

        $newBalance = $account->dr_amount - $account->cr_amount;
        $account->updateQuietly(['balance' => $newBalance]);
    }
}
