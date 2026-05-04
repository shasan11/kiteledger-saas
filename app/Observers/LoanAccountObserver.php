<?php

namespace App\Observers;

use App\Models\LoanAccount;
use App\Observers\Concerns\CapturesAccountingEffect;
use App\Domain\Accounting\Services\LoanAccountService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LoanAccountObserver
{
    use CapturesAccountingEffect;

    public function saving(LoanAccount $loanAccount): void
    {
        if ((float) $loanAccount->opening_balance < 0) {
            throw ValidationException::withMessages([
                'opening_balance' => 'Opening balance cannot be negative.',
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
    }

    public function updating(LoanAccount $loanAccount): void
    {
        $fresh = LoanAccount::query()->find($loanAccount->getKey());

        if ($fresh) {
            $oldEffect = app(LoanAccountService::class)->snapshotEffect($fresh);

            $this->storeOldEffect($loanAccount, null, $oldEffect);
        }
    }

    public function saved(LoanAccount $loanAccount): void
    {
        DB::transaction(function () use ($loanAccount) {
            $oldEffect = $this->pullOldEffect($loanAccount);

            app(LoanAccountService::class)->syncFinancials(
                loanAccount: $loanAccount->fresh(),
                oldEffect: $oldEffect
            );
        });
    }

    public function deleting(LoanAccount $loanAccount): void
    {
        if ($loanAccount->status === 'active' && (float) $loanAccount->current_balance > 0) {
            throw ValidationException::withMessages([
                'loan_account' => 'Active loan with balance cannot be deleted.',
            ]);
        }
    }
}