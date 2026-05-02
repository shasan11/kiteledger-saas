<?php

namespace App\Observers;

use App\Models\ChartOfAccount;
use App\Services\Accounting\AccountSyncService;
use Illuminate\Support\Facades\DB;

class ChartOfAccountObserver
{
    public function __construct(protected AccountSyncService $accountSyncService)
    {
    }

    public function saving(ChartOfAccount $chartOfAccount): void
    {
        $this->accountSyncService->prepareChartOfAccountBeforeSave($chartOfAccount);
    }

    public function saved(ChartOfAccount $chartOfAccount): void
    {
        $this->accountSyncService->syncChartOfAccount($chartOfAccount);
    }

    public function deleting(ChartOfAccount $chartOfAccount): void
    {
        DB::transaction(function () use ($chartOfAccount): void {
            if ($chartOfAccount->account_id) {
                $this->accountSyncService->deactivateLinkedAccount($chartOfAccount->account_id);
            }
        });
    }
}
