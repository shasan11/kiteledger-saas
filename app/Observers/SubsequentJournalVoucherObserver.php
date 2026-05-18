<?php

namespace App\Observers;

use App\Services\ParallelJournalVoucherService;
use Illuminate\Database\Eloquent\Model;

class SubsequentJournalVoucherObserver
{
    public function __construct(
        protected ParallelJournalVoucherService $journalVoucherService,
    ) {
    }

    public function saved(Model $model): void
    {
        if (!(bool) ($model->approved ?? false)) {
            return;
        }

        if ((bool) ($model->void ?? false)) {
            $this->journalVoucherService->reverseForSource($model, $model->voided_reason ?? 'Voided');
            return;
        }

        $this->journalVoucherService->createForApprovedSource($model);
    }
}
