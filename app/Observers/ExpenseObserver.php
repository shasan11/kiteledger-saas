<?php

namespace App\Observers;

use App\Models\Expense;
use App\Observers\Concerns\HandlesAccountingTransactionObserver;

class ExpenseObserver
{
    use HandlesAccountingTransactionObserver;

    public function updated(Expense $model): void
    {
        $this->handleAccountingTransactionUpdated($model);
    }
}
