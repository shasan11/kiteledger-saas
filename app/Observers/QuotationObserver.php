<?php

namespace App\Observers;

use App\Models\Quotation;
use App\Services\TransactionApprovalService;
use App\Services\TransactionVoidService;

class QuotationObserver
{
    public function __construct(
        protected TransactionApprovalService $approvalService,
        protected TransactionVoidService $voidService,
    ) {
    }

    public function updated(Quotation $model): void
    {
        if ($model->wasChanged('approved') && (bool) $model->approved === true) {
            $this->approvalService->handleApprovedTransition($model);
        }

        if ($model->wasChanged('void') && (bool) $model->void === true) {
            $this->voidService->void($model, $model->voided_reason ?? 'Voided');
        }

        if ($model->wasChanged('status') && in_array($model->status, ['cancelled', 'void'], true)) {
            $this->voidService->cancel($model, $model->voided_reason ?? 'Cancelled');
        }
    }
}