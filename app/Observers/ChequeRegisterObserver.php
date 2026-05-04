<?php

namespace App\Observers;

use App\Models\ChequeRegister;
use App\Observers\Concerns\CapturesAccountingEffect;
use App\Domain\Accounting\Services\ChequeRegisterService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ChequeRegisterObserver
{
    use CapturesAccountingEffect;

    public function saving(ChequeRegister $chequeRegister): void
    {
        if ((float) $chequeRegister->amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'Cheque amount must be greater than zero.',
            ]);
        }

        if ($chequeRegister->account_id === $chequeRegister->related_account_id) {
            throw ValidationException::withMessages([
                'related_account_id' => 'Cheque account and related account cannot be same.',
            ]);
        }
    }

    public function updating(ChequeRegister $chequeRegister): void
    {
        $fresh = ChequeRegister::query()->find($chequeRegister->getKey());

        if ($fresh) {
            $oldEffect = app(ChequeRegisterService::class)->snapshotEffect($fresh);

            $this->storeOldEffect($chequeRegister, null, $oldEffect);
        }
    }

    public function saved(ChequeRegister $chequeRegister): void
    {
        DB::transaction(function () use ($chequeRegister) {
            $oldEffect = $this->pullOldEffect($chequeRegister);

            app(ChequeRegisterService::class)->syncFinancials(
                chequeRegister: $chequeRegister->fresh(),
                oldEffect: $oldEffect
            );
        });
    }

    public function deleting(ChequeRegister $chequeRegister): void
    {
        if ($chequeRegister->status === 'cleared' && !$chequeRegister->void) {
            throw ValidationException::withMessages([
                'cheque_register' => 'Cleared cheque cannot be deleted. Void or cancel it instead.',
            ]);
        }
    }
}