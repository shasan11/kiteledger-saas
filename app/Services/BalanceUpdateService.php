<?php

namespace App\Services;

use App\Domain\Accounting\Services\JournalVoucherService;
use App\Models\Account;
use App\Models\JournalVoucher;
use Illuminate\Support\Facades\DB;

class BalanceUpdateService
{
    public function __construct(
        protected JournalVoucherService $journalVoucherService,
    ) {
    }

    public function applyJournalVoucher(JournalVoucher $journalVoucher): void
    {
        if (!$journalVoucher->approved && $journalVoucher->status !== 'posted') {
            return;
        }

        $this->journalVoucherService->post($journalVoucher);
    }

    public function reverseJournalVoucher(JournalVoucher $journalVoucher): void
    {
        if ($journalVoucher->status !== 'posted' || (bool) $journalVoucher->void) {
            return;
        }

        $this->journalVoucherService->void($journalVoucher, 'Reversed by balance service.');
    }

    public function recalculateAccount(Account $account): void
    {
        DB::transaction(function () use ($account) {
            $result = DB::table('journal_voucher_lines')
                ->join('journal_vouchers', 'journal_voucher_lines.journal_voucher_id', '=', 'journal_vouchers.id')
                ->leftJoin('chart_of_accounts', 'chart_of_accounts.id', '=', 'journal_voucher_lines.chart_of_account_id')
                ->where(function ($query) use ($account) {
                    $query->where('journal_voucher_lines.account_id', $account->id)
                        ->orWhere('chart_of_accounts.account_id', $account->id);
                })
                ->where('journal_vouchers.status', 'posted')
                ->where('journal_vouchers.active', true)
                ->where('journal_vouchers.void', false)
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

}
