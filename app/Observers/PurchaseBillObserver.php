<?php

namespace App\Observers;

use App\Models\PurchaseBill;
use App\Observers\Concerns\HandlesAccountingTransactionObserver;
use App\Services\Inventory\PurchaseBillStockPostingService;
use Illuminate\Support\Facades\DB;

class PurchaseBillObserver
{
    use HandlesAccountingTransactionObserver;

    private static bool $postingStock = false;

    public function updated(PurchaseBill $model): void
    {
        $this->handleAccountingTransactionUpdated($model);

        if ($model->wasChanged('approved') && (bool) $model->approved === true) {
            // Safety-net: post warehouse stock after the transaction commits so
            // that all child lines are guaranteed persisted. The service is
            // idempotent, so this is a no-op if approve() already ran it.
            DB::connection()->afterCommit(function () use ($model) {
                if (static::$postingStock) {
                    return;
                }

                $fresh = $model->fresh();
                if (!$fresh || !(bool) $fresh->approved || (bool) ($fresh->void ?? false)) {
                    return;
                }

                static::$postingStock = true;
                try {
                    app(PurchaseBillStockPostingService::class)->post($fresh);
                } finally {
                    static::$postingStock = false;
                }
            });
        }
    }
}
