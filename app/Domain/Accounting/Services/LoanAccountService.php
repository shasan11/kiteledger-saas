<?php

namespace App\Domain\Accounting\Services;

use App\Models\LoanAccount;
use App\Models\LoanPayback;
use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use App\Models\AccountingConfiguration;
use App\Models\ChartOfAccount;
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
            $expenseAccountId = $this->resolveConfiguredAccountId(
                key: 'loan_processing_fee_expense_account_id',
                label: 'Loan Processing Fee Expense Account'
            );

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
        $loanAccount->loadMissing(['loanTopUps', 'loanPaybacks']);

        $topupTotal = $loanAccount->loanTopUps
            ->where('active', true)
            ->sum(fn ($topup) => (float) $topup->amount);

        $paybackTotal = $loanAccount->loanPaybacks
            ->where('active', true)
            ->sum(fn ($payback) => (float) $payback->amount);

        $balance = round(
            (float) $loanAccount->opening_balance + $topupTotal - $paybackTotal,
            6
        );

        $loanAccount->forceFill([
            'current_balance' => max(0, $balance),
        ])->saveQuietly();
    }

    /**
     * Record a principal repayment for a loan account.
     *
     * Accounting entry:
     *   Dr  Loan Liability Account (related_account_id)   — reduces liability
     *   Cr  Bank / Cash Account (paid_from_account_id)    — cash paid out
     *
     * @param  LoanAccount  $loanAccount
     * @param  array{
     *   payback_date: string,
     *   amount: float,
     *   paid_from_account_id: string,
     *   reference: string|null,
     *   notes: string|null,
     * }  $data
     * @param  int|null  $userId
     * @return LoanPayback
     */
    public function recordPayback(LoanAccount $loanAccount, array $data, ?int $userId = null): LoanPayback
    {
        $amount = round((float) $data['amount'], 6);

        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'Payback amount must be greater than zero.',
            ]);
        }

        if (!$loanAccount->related_account_id) {
            throw ValidationException::withMessages([
                'related_account_id' => 'Loan liability account is not configured. Please set it on the loan account before recording a payback.',
            ]);
        }

        return DB::transaction(function () use ($loanAccount, $data, $amount, $userId) {
            // Create the payback record
            $payback = LoanPayback::create([
                'loan_account_id'       => $loanAccount->id,
                'payback_date'          => $data['payback_date'],
                'amount'                => $amount,
                'paid_from_account_id'  => $data['paid_from_account_id'],
                'reference'             => $data['reference'] ?? null,
                'notes'                 => $data['notes'] ?? null,
                'active'                => true,
                'is_system_generated'   => false,
                'user_add_id'           => $userId,
            ]);

            // Post journal voucher
            //   Dr  Loan Liability (related_account_id)
            //   Cr  Bank/Cash      (paid_from_account_id)
            $jv = JournalVoucher::create([
                'voucher_date'         => $data['payback_date'],
                'reference'            => $data['reference'] ?? null,
                'narration'            => 'Principal repayment — ' . $loanAccount->name,
                'remarks'              => $data['notes'] ?? null,
                'source_type'          => LoanPayback::class,
                'source_id'            => $payback->id,
                'source_module'        => 'loan_payback',
                'is_auto_generated'    => true,
                'is_system_generated'  => true,
                'status'               => 'posted',
                'active'               => true,
                'approved'             => true,
                'void'                 => false,
                'exchange_rate'        => 1,
                'total'                => $amount,
                'user_add_id'          => $userId,
            ]);

            // Debit: Loan liability account (reduces the liability)
            JournalVoucherLine::create([
                'journal_voucher_id' => $jv->id,
                'account_id'         => $loanAccount->related_account_id,
                'description'        => 'Principal repayment — ' . $loanAccount->name,
                'debit'              => $amount,
                'credit'             => 0,
                'exchange_rate'      => 1,
            ]);

            // Credit: Bank/Cash account (cash paid out)
            JournalVoucherLine::create([
                'journal_voucher_id' => $jv->id,
                'account_id'         => $data['paid_from_account_id'],
                'description'        => 'Principal repayment — ' . $loanAccount->name,
                'debit'              => 0,
                'credit'             => $amount,
                'exchange_rate'      => 1,
            ]);

            // Link JV to the payback record
            $payback->forceFill(['journal_voucher_id' => $jv->id])->saveQuietly();

            // Recalculate the running balance on the loan account
            $this->recalculateCurrentBalance($loanAccount->fresh(['loanTopUps', 'loanPaybacks']));

            return $payback->load(['paidFromAccount', 'journalVoucher']);
        });
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
                'account_id' => $this->resolveConfiguredAccountId(
                    key: 'loan_processing_fee_expense_account_id',
                    label: 'Loan Processing Fee Expense Account'
                ),
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

    protected function resolveConfiguredAccountId(string $key, string $label): string
    {
        $configured = config("accounting.{$key}");

        if (! $configured) {
            $configured = AccountingConfiguration::query()
                ->where('active', true)
                ->oldest()
                ->value($key);
        }

        if (! $configured) {
            throw ValidationException::withMessages([
                $key => "{$label} is missing in Accounting Configuration.",
            ]);
        }

        $accountId = ChartOfAccount::query()
            ->whereKey($configured)
            ->value('account_id');

        if ($accountId) {
            return $accountId;
        }

        if (\App\Models\Account::query()->whereKey($configured)->exists()) {
            return $configured;
        }

        throw ValidationException::withMessages([
            $key => "{$label} is not linked to a valid ledger account.",
        ]);
    }
}
