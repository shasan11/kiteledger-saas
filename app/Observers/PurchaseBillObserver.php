<?php

namespace App\Observers;

use App\Models\PurchaseBill;
use App\Observers\Concerns\HandlesAccountingTransactionObserver;

class PurchaseBillObserver
{
    use HandlesAccountingTransactionObserver;

    public function updated(PurchaseBill $model): void
    {
        $this->handleAccountingTransactionUpdated($model);
    }
}
