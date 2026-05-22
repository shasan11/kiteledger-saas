<?php

namespace App\Domain\Accounting\Services;

use App\Models\LoanAccount;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LoanAccountService
{
    public function __construct(
        protected PostingService $postingService,
        protected SystemJournalVoucherService $systemJournalVoucherService
    ) {}

    public function snapshotEffect(LoanAccount $loanAccount): array
    {
        if (! $this->isFinanciallyActive($loanAccount)) {
            return [];
        }

        $this->validate($loanAccount);

        $effect = [];

        $openingBalance = (float) $loanAccount->opening_balance;

        if ($openingBalance > 0) {
            $this->postingService->addDebit(
                effect: $effect,
                accountId: $loanAccount->loan_received_in_account_id,
                amount: $openingBalance
            );

            $this->postingService->addCredit(
                effect: $effect,
                accountId: $loanAccount->related_account_id,
                amount: $openingBalance
            );
        }

        $processingFee = (float) $loanAccount->processing_fee;

        if ($processingFee > 0) {
            $expenseAccountId = config('accounting.loan_processing_fee_expense_account_id');

            if (! $expenseAccountId) {
                throw ValidationException::withMessages([
                    'processing_fee' => 'Set accounting.loan_processing_fee_expense_account_id before posting loan processing fee.',
                ]);
            }

            $this->postingService->addDebit(
                effect: $effect,
                accountId: $expenseAccountId,
                amount: $processingFee
            );

            $this->postingService->addCredit(
                effect: $effect,
                accountId: $loanAccount->processing_fee_paid_from_account_id,
                amount: $processingFee
            );
        }

        return $this->postingService->normalizeEffect($effect);
    }

    public function syncFinancials(LoanAccount $loanAccount, array $oldEffect = []): void
    {
        DB::transaction(function () use ($loanAccount) {
            $loanAccount = LoanAccount::query()
                ->with('loanTopUps')
                ->lockForUpdate()
                ->findOrFail($loanAccount->id);

            $this->validate($loanAccount);
            $this->recalculateCurrentBalance($loanAccount);
            $this->syncGeneratedJournalVoucher($loanAccount);
        });
    }

    public function validate(LoanAccount $loanAccount): void
    {
        if ((float) $loanAccount->opening_balance < 0) {
            throw ValidationException::withMessages([
                'opening_balance' => 'Opening balance cannot be negative.',
            ]);
        }

        if ((float) $loanAccount->current_balance < 0) {
            throw ValidationException::withMessages([
                'current_balance' => 'Current balance cannot be negative.',
            ]);
        }

        if ((float) $loanAccount->interest_rate_per_annum < 0) {
            throw ValidationException::withMessages([
                'interest_rate_per_annum' => 'Interest rate cannot be negative.',
            ]);
        }

        if ((float) $loanAccount->processing_fee < 0) {
            throw ValidationException::withMessages([
                'processing_fee' => 'Processing fee cannot be negative.',
            ]);
        }

        if ((float) $loanAccount->opening_balance > 0) {
            if (! $loanAccount->loan_received_in_account_id) {
                throw ValidationException::withMessages([
                    'loan_received_in_account_id' => 'Loan received-in account is required.',
                ]);
            }

            if (! $loanAccount->related_account_id) {
                throw ValidationException::withMessages([
                    'related_account_id' => 'Loan liability account is required.',
                ]);
            }
        }

        if ((float) $loanAccount->processing_fee > 0 && ! $loanAccount->processing_fee_paid_from_account_id) {
            throw ValidationException::withMessages([
                'processing_fee_paid_from_account_id' => 'Processing fee paid-from account is required.',
            ]);
        }
    }

    public function recalculateCurrentBalance(LoanAccount $loanAccount): void
    {
        $loanAccount->loadMissing('loanTopUps');

        $topupTotal = $loanAccount->loanTopUps
            ->where('active', true)
            ->sum(fn ($topup) => (float) $topup->amount);

        $loanAccount->forceFill([
            'current_balance' => round((float) $loanAccount->opening_balance + $topupTotal, 6),
        ])->saveQuietly();
    }

    protected function syncGeneratedJournalVoucher(LoanAccount $loanAccount): void
    {
        $entries = [];

        $openingBalance = (float) $loanAccount->opening_balance;

        if ($openingBalance > 0) {
            $entries[] = [
                'account_id' => $loanAccount->loan_received_in_account_id,
                'debit' => $openingBalance,
                'credit' => 0,
                'description' => 'Loan received',
            ];

            $entries[] = [
                'account_id' => $loanAccount->related_account_id,
                'debit' => 0,
                'credit' => $openingBalance,
                'description' => 'Loan liability recorded',
            ];
        }

        $processingFee = (float) $loanAccount->processing_fee;

        if ($processingFee > 0) {
            $entries[] = [
                'account_id' => config('accounting.loan_processing_fee_expense_account_id'),
                'debit' => $processingFee,
                'credit' => 0,
                'description' => 'Loan processing fee',
            ];

            $entries[] = [
                'account_id' => $loanAccount->processing_fee_paid_from_account_id,
                'debit' => 0,
                'credit' => $processingFee,
                'description' => 'Processing fee paid',
            ];
        }

        if (empty($entries)) {
            return;
        }

        $this->systemJournalVoucherService->syncFromEntries(
            sourceType: 'loan_account',
            source: $loanAccount,
            date: $loanAccount->balance_as_of ?: now()->toDateString(),
            entries: $entries,
            branchId: null,
            currencyId: null,
            status: $this->isFinanciallyActive($loanAccount) ? 'posted' : 'draft',
            narration: 'System generated journal voucher from loan account '.$loanAccount->name,
            exchangeRate: 1
        );
    }

    protected function isFinanciallyActive(LoanAccount $loanAccount): bool
    {
        return (bool) ($loanAccount->active ?? true)
            && in_array($loanAccount->status, ['active', 'settled', 'closed'], true)
            && $loanAccount->status !== 'cancelled';
    }
}
