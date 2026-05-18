<?php

namespace App\Observers\Concerns;

use App\Services\TransactionApprovalService;
use App\Services\TransactionVoidService;
use Illuminate\Database\Eloquent\Model;

trait HandlesAccountingTransactionObserver
{
    public function __construct(
        protected TransactionApprovalService $approvalService,
        protected TransactionVoidService $voidService,
    ) {
    }

    protected function handleAccountingTransactionUpdated(Model $model): void
    {
        if ($model->wasChanged('approved') && (bool) $model->approved === true) {
            $fresh = $model->fresh();
            if ($fresh) {
                $this->approvalService->handleApprovedTransition($fresh);
            }
        }

        if ($model->wasChanged('void') && (bool) $model->void === true) {
            $fresh = $model->fresh();
            if ($fresh) {
                $this->voidService->void($fresh, $fresh->voided_reason ?? 'Voided');
            }
        }

        if ($model->wasChanged('status') && in_array($model->status, ['cancelled', 'void'], true)) {
            $fresh = $model->fresh();
            if ($fresh && !(bool) ($fresh->void ?? false)) {
                $this->voidService->cancel($fresh, $fresh->voided_reason ?? 'Cancelled');
            }
        }
    }
}
