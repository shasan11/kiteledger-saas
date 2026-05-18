<?php

namespace App\Observers;

use App\Models\PurchaseOrder;
use App\Observers\Concerns\HandlesAccountingTransactionObserver;

class PurchaseOrderObserver
{
    use HandlesAccountingTransactionObserver;

    public function updated(PurchaseOrder $model): void
    {
        $this->handleAccountingTransactionUpdated($model);
    }
}
