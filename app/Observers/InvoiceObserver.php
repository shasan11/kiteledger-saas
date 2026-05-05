<?php

namespace App\Observers;

use App\Models\Invoice;
use App\Services\TransactionApprovalService;
use App\Services\TransactionVoidService;

class InvoiceObserver
{
    public function __construct(
        protected TransactionApprovalService $approvalService,
        protected TransactionVoidService $voidService,
    ) {
    }

    public function updated(Invoice $invoice): void
    {
        if ($invoice->wasChanged('approved') && (bool) $invoice->approved === true) {
            $this->approvalService->handleApprovedTransition($invoice);
        }

        if ($invoice->wasChanged('void') && (bool) $invoice->void === true) {
            $this->voidService->void($invoice, $invoice->voided_reason ?? 'Voided');
        }

        if ($invoice->wasChanged('status') && in_array($invoice->status, ['cancelled', 'void'], true)) {
            $this->voidService->cancel($invoice, $invoice->voided_reason ?? 'Cancelled');
        }
    }
}
