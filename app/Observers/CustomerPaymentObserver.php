<?php

namespace App\Observers;

use App\Models\CustomerPayment;
use App\Services\TransactionApprovalService;
use App\Services\TransactionVoidService;

class CustomerPaymentObserver
{
    public function __construct(
        protected TransactionApprovalService $approvalService,
        protected TransactionVoidService $voidService,
    ) {
    }

    public function updated(CustomerPayment $payment): void
    {
        if ($payment->wasChanged('approved') && (bool) $payment->approved === true) {
            $this->approvalService->handleApprovedTransition($payment);
        }

        if ($payment->wasChanged('void') && (bool) $payment->void === true) {
            $this->voidService->void($payment, $payment->voided_reason ?? 'Voided');
        }

        if ($payment->wasChanged('status') && in_array($payment->status, ['cancelled', 'void'], true)) {
            $this->voidService->cancel($payment, $payment->voided_reason ?? 'Cancelled');
        }
    }
}
