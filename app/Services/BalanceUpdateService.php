<?php

namespace App\Services;

use App\Domain\Accounting\Services\JournalVoucherService;
use App\Models\Account;
use App\Models\JournalVoucher;
use Illuminate\Database\Eloquent\Collection;
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
        DB::transaction(function () use ($account): void {
            $result = DB::table('journal_voucher_lines')
                ->join(
                    'journal_vouchers',
                    'journal_voucher_lines.journal_voucher_id',
                    '=',
                    'journal_vouchers.id'
                )
                ->join(
                    'chart_of_accounts',
                    'journal_voucher_lines.chart_of_account_id',
                    '=',
                    'chart_of_accounts.id'
                )
                ->where('chart_of_accounts.account_id', $account->id)
                ->where('journal_vouchers.status', 'posted')
                ->where('journal_vouchers.active', true)
                ->where('journal_vouchers.void', false)
                ->selectRaw('
                    COALESCE(SUM(COALESCE(journal_voucher_lines.debit, 0)), 0) as total_debit,
                    COALESCE(SUM(COALESCE(journal_voucher_lines.credit, 0)), 0) as total_credit
                ')
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
        Account::query()
            ->orderBy('id')
            ->chunk(100, function (Collection $accounts): void {
                /** @var Account $account */
                foreach ($accounts as $account) {
                    $this->recalculateAccount($account);
                }
            });
    }
}