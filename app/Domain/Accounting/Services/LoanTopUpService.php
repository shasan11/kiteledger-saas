<?php

namespace App\Domain\Accounting\Services;

use App\Models\LoanAccount;
use App\Models\LoanTopUp;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LoanTopUpService
{
    public function __construct(
        protected PostingService $postingService,
        protected SystemJournalVoucherService $systemJournalVoucherService
    ) {}

    public function snapshotEffect(LoanTopUp $loanTopUp): array
    {
        $loanTopUp->loadMissing('loanAccount');

        if (!(bool) ($loanTopUp->active ?? true)) {
            return [];
        }

        $this->validate($loanTopUp);

        $effect = [];

        $amount = (float) $loanTopUp->amount;

        $this->postingService->addDebit(
            effect: $effect,
            accountId: $loanTopUp->loan_received_in_account_id,
            amount: $amount
        );

        $this->postingService->addCredit(
            effect: $effect,
            accountId: $loanTopUp->loanAccount?->related_account_id,
            amount: $amount
        );

        return $this->postingService->normalizeEffect($effect);
    }

    public function syncFinancials(LoanTopUp $loanTopUp, array $oldEffect = []): void
    {
        DB::transaction(function () use ($loanTopUp) {
            $loanTopUp = LoanTopUp::query()
                ->with('loanAccount')
                ->lockForUpdate()
                ->findOrFail($loanTopUp->id);

            $this->validate($loanTopUp);
            $this->syncGeneratedJournalVoucher($loanTopUp);
            $this->recalculateLoanBalance($loanTopUp->loan_account_id);
        });
    }

    public function validate(LoanTopUp $loanTopUp): void
    {
        if (!$loanTopUp->loan_account_id) {
            throw ValidationException::withMessages([
                'loan_account_id' => 'Loan account is required.',
            ]);
        }

        if (!$loanTopUp->loan_received_in_account_id) {
            throw ValidationException::withMessages([
                'loan_received_in_account_id' => 'Loan received-in account is required.',
            ]);
        }

        if ((float) $loanTopUp->amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'Loan top-up amount must be greater than zero.',
            ]);
        }

        if (!$loanTopUp->loanAccount?->related_account_id) {
            throw ValidationException::withMessages([
                'related_account_id' => 'Loan liability account is missing on loan account.',
            ]);
        }
    }

    protected function syncGeneratedJournalVoucher(LoanTopUp $loanTopUp): void
    {
        $amount = (float) $loanTopUp->amount;

        $entries = [
            [
                'account_id' => $loanTopUp->loan_received_in_account_id,
                'debit' => $amount,
                'credit' => 0,
                'description' => 'Loan top-up received',
            ],
            [
                'account_id' => $loanTopUp->loanAccount->related_account_id,
                'debit' => 0,
                'credit' => $amount,
                'description' => 'Loan liability increased',
            ],
        ];

        $this->systemJournalVoucherService->syncFromEntries(
            sourceType: 'loan_top_up',
            source: $loanTopUp,
            date: $loanTopUp->topup_date,
            entries: $entries,
            branchId: null,
            currencyId: null,
            status: (bool) ($loanTopUp->active ?? true) ? 'posted' : 'draft',
            narration: 'System generated journal voucher from loan top-up',
            exchangeRate: 1
        );
    }

    protected function recalculateLoanBalance(string $loanAccountId): void
    {
        $loanAccount = LoanAccount::query()
            ->with('loanTopUps')
            ->lockForUpdate()
            ->find($loanAccountId);

        if (!$loanAccount) {
            return;
        }

        $topupTotal = $loanAccount->loanTopUps
            ->where('active', true)
            ->sum(fn ($topup) => (float) $topup->amount);

        $loanAccount->forceFill([
            'current_balance' => round((float) $loanAccount->opening_balance + $topupTotal, 6),
        ])->saveQuietly();
    }
}
