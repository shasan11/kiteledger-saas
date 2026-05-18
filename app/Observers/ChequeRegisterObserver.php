<?php

namespace App\Observers;

use App\Models\ChequeRegister;
use App\Domain\Accounting\Services\ChequeRegisterService;
use Illuminate\Validation\ValidationException;

class ChequeRegisterObserver
{
    public function __construct(
        protected ChequeRegisterService $chequeRegisterService,
    ) {
    }

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

    public function saved(ChequeRegister $chequeRegister): void
    {
        $this->chequeRegisterService->recalculateTotal($chequeRegister);
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
