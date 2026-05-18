<?php

namespace App\Observers;

use App\Models\DebitNote;
use App\Observers\Concerns\HandlesAccountingTransactionObserver;

class DebitNoteObserver
{
    use HandlesAccountingTransactionObserver;

    public function updated(DebitNote $model): void
    {
        $this->handleAccountingTransactionUpdated($model);
    }
}
