<?php

namespace App\Observers;

use App\Models\LoanTopUp;
use App\Observers\Concerns\CapturesAccountingEffect;
use App\Domain\Accounting\Services\LoanTopUpService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LoanTopUpObserver
{
    use CapturesAccountingEffect;

    public function saving(LoanTopUp $loanTopUp): void
    {
        if ((float) $loanTopUp->amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'Loan top-up amount must be greater than zero.',
            ]);
        }
    }

    public function updating(LoanTopUp $loanTopUp): void
    {
        $fresh = LoanTopUp::query()->find($loanTopUp->getKey());

        if ($fresh) {
            $oldEffect = app(LoanTopUpService::class)->snapshotEffect($fresh);

            $this->storeOldEffect($loanTopUp, null, $oldEffect);
        }
    }

    public function saved(LoanTopUp $loanTopUp): void
    {
        DB::transaction(function () use ($loanTopUp) {
            $oldEffect = $this->pullOldEffect($loanTopUp);

            app(LoanTopUpService::class)->syncFinancials(
                loanTopUp: $loanTopUp->fresh(),
                oldEffect: $oldEffect
            );
        });
    }

    public function deleting(LoanTopUp $loanTopUp): void
    {
        throw ValidationException::withMessages([
            'loan_top_up' => 'Loan top-up should not be deleted. Reverse it using a proper adjustment.',
        ]);
    }
}