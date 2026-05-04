<?php

namespace App\Observers;

use App\Models\LoanCharge;
use App\Observers\Concerns\CapturesAccountingEffect;
use App\Domain\Accounting\Services\LoanChargeService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LoanChargeObserver
{
    use CapturesAccountingEffect;

    public function saving(LoanCharge $loanCharge): void
    {
        if ((float) $loanCharge->amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'Loan charge amount must be greater than zero.',
            ]);
        }
    }

    public function updating(LoanCharge $loanCharge): void
    {
        $fresh = LoanCharge::query()->find($loanCharge->getKey());

        if ($fresh) {
            $oldEffect = app(LoanChargeService::class)->snapshotEffect($fresh);

            $this->storeOldEffect($loanCharge, null, $oldEffect);
        }
    }

    public function saved(LoanCharge $loanCharge): void
    {
        DB::transaction(function () use ($loanCharge) {
            $oldEffect = $this->pullOldEffect($loanCharge);

            app(LoanChargeService::class)->syncFinancials(
                loanCharge: $loanCharge->fresh(),
                oldEffect: $oldEffect
            );
        });
    }

    public function deleting(LoanCharge $loanCharge): void
    {
        throw ValidationException::withMessages([
            'loan_charge' => 'Loan charge should not be deleted. Reverse it using a proper adjustment.',
        ]);
    }
}