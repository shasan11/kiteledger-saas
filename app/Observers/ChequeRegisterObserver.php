<?php

namespace App\Observers;

use App\Models\ChequeRegister;
use App\Domain\Accounting\Services\ChequeRegisterService;
use App\Services\TransactionApprovalService;
use App\Services\TransactionVoidService;
use Illuminate\Validation\ValidationException;

class ChequeRegisterObserver
{
    public function __construct(
        protected ChequeRegisterService $chequeRegisterService,
        protected TransactionApprovalService $approvalService,
        protected TransactionVoidService $voidService,
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

    public function updated(ChequeRegister $chequeRegister): void
    {
        if (
            $chequeRegister->wasChanged('approved')
            && (bool) $chequeRegister->approved === true
        ) {
            $this->approvalService->handleApprovedTransition($chequeRegister);
        }

        if (
            $chequeRegister->wasChanged('status')
            && $chequeRegister->status === 'cleared'
            && ! (bool) $chequeRegister->approved
        ) {
            $this->approvalService->approve($chequeRegister, request()->user()?->getAuthIdentifier());
        }

        if ($chequeRegister->wasChanged('void') && (bool) $chequeRegister->void === true) {
            $this->voidService->void($chequeRegister, $chequeRegister->voided_reason ?? 'Voided');
        }

        if ($chequeRegister->wasChanged('status') && in_array($chequeRegister->status, ['cancelled'], true)) {
            $this->voidService->cancel($chequeRegister, $chequeRegister->voided_reason ?? 'Cancelled');
        }
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
