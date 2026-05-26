<?php

namespace App\Observers;

use App\Models\InventoryAdjustment;
use App\Services\Inventory\WarehouseStockService;
use App\Services\TransactionVoidService;
use Illuminate\Support\Facades\DB;

class InventoryAdjustmentObserver
{
    private static bool $posting = false;

    public function __construct(
        protected TransactionVoidService $voidService,
    ) {
    }

    public function updated(InventoryAdjustment $model): void
    {
        $this->maybePostStock($model);

        if ($model->wasChanged('void') && (bool) $model->void === true) {
            $this->voidService->void($model, $model->voided_reason ?? 'Voided');
        }

        if ($model->wasChanged('status') && in_array($model->status, ['cancelled', 'void'], true)) {
            $this->voidService->cancel($model, $model->voided_reason ?? 'Cancelled');
        }
    }

    private function maybePostStock(InventoryAdjustment $model): void
    {
        $approvedTrigger = $model->wasChanged('approved') && (bool) $model->approved === true;
        $statusTrigger   = $model->wasChanged('status') && $model->status === 'posted';

        if (!$approvedTrigger && !$statusTrigger) {
            return;
        }

        // Quick pre-check on the in-memory model before deferring.
        if ($model->stock_posted || $model->void) {
            return;
        }

        // Defer until the outermost DB transaction commits so that nested
        // lines and afterSave posting are all flushed first.
        // When called outside any transaction this fires immediately.
        DB::connection()->afterCommit(function () use ($model) {
            if (static::$posting) {
                return;
            }

            // Re-read from DB to get the authoritative post-commit state.
            $fresh = $model->fresh();
            if (!$fresh || $fresh->stock_posted || $fresh->void) {
                return;
            }

            if (!$fresh->approved && $fresh->status !== 'posted') {
                return;
            }

            static::$posting = true;
            try {
                app(WarehouseStockService::class)->postInventoryAdjustment($fresh);
            } finally {
                static::$posting = false;
            }
        });
    }
}
