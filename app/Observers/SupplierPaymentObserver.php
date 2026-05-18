<?php

namespace App\Observers;

use App\Models\SupplierPayment;
use App\Observers\Concerns\HandlesAccountingTransactionObserver;

class SupplierPaymentObserver
{
    use HandlesAccountingTransactionObserver;

    public function updated(SupplierPayment $model): void
    {
        $this->handleAccountingTransactionUpdated($model);
    }
}
