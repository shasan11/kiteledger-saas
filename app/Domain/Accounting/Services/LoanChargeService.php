<?php

namespace App\Domain\Accounting\Services;

use App\Models\LoanCharge;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LoanChargeService
{
    public function __construct(
        protected PostingService $postingService,
        protected SystemJournalVoucherService $systemJournalVoucherService
    ) {}

    public function snapshotEffect(LoanCharge $loanCharge): array
    {
        if (!(bool) ($loanCharge->active ?? true)) {
            return [];
        }

        $this->validate($loanCharge);

        $effect = [];

        $expenseAccountId = $this->resolveExpenseAccountId();

        $this->postingService->addDebit(
            effect: $effect,
            accountId: $expenseAccountId,
            amount: $loanCharge->amount
        );

        $this->postingService->addCredit(
            effect: $effect,
            accountId: $loanCharge->charges_paid_from_account_id,
            amount: $loanCharge->amount
        );

        return $this->postingService->normalizeEffect($effect);
    }

    public function syncFinancials(LoanCharge $loanCharge, array $oldEffect = []): void
    {
        DB::transaction(function () use ($loanCharge) {
            $loanCharge = LoanCharge::query()
                ->with('loanAccount')
                ->lockForUpdate()
                ->findOrFail($loanCharge->id);

            $this->validate($loanCharge);
            $this->syncGeneratedJournalVoucher($loanCharge);
        });
    }

    public function validate(LoanCharge $loanCharge): void
    {
        if (!$loanCharge->loan_account_id) {
            throw ValidationException::withMessages([
                'loan_account_id' => 'Loan account is required.',
            ]);
        }

        if ((float) $loanCharge->amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'Loan charge amount must be greater than zero.',
            ]);
        }

        if (!$loanCharge->charges_paid_from_account_id) {
            throw ValidationException::withMessages([
                'charges_paid_from_account_id' => 'Charges paid-from account is required.',
            ]);
        }

        if (!$this->resolveExpenseAccountId()) {
            throw ValidationException::withMessages([
                'loan_charge_expense_account_id' => 'Set accounting.loan_charge_expense_account_id before posting loan charges.',
            ]);
        }
    }

    protected function syncGeneratedJournalVoucher(LoanCharge $loanCharge): void
    {
        $amount = (float) $loanCharge->amount;
        $expenseAccountId = $this->resolveExpenseAccountId();

        $entries = [
            [
                'account_id' => $expenseAccountId,
                'debit' => $amount,
                'credit' => 0,
                'description' => $loanCharge->charge_name,
            ],
            [
                'account_id' => $loanCharge->charges_paid_from_account_id,
                'debit' => 0,
                'credit' => $amount,
                'description' => 'Loan charge paid',
            ],
        ];

        $this->systemJournalVoucherService->syncFromEntries(
            sourceType: 'loan_charge',
            source: $loanCharge,
            date: $loanCharge->charge_date,
            entries: $entries,
            branchId: null,
            currencyId: null,
            status: (bool) ($loanCharge->active ?? true) ? 'posted' : 'draft',
            narration: 'System generated journal voucher from loan charge ' . $loanCharge->charge_name,
            exchangeRate: 1
        );
    }

    protected function resolveExpenseAccountId(): ?string
    {
        return config('accounting.loan_charge_expense_account_id');
    }
}
