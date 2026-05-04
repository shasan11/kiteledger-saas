<?php

namespace App\Observers;

use App\Models\ChartOfAccount;
use App\Domain\Accounting\Services\ChartOfAccountService;
use Illuminate\Support\Facades\DB;

class ChartOfAccountObserver
{
    public function creating(ChartOfAccount $chartOfAccount): void
    {
        app(ChartOfAccountService::class)->assignCodeIfMissing($chartOfAccount);
    }

    public function saved(ChartOfAccount $chartOfAccount): void
    {
        DB::transaction(function () use ($chartOfAccount) {
            app(ChartOfAccountService::class)->syncLinkedAccount($chartOfAccount);
        });
    }

    public function deleted(ChartOfAccount $chartOfAccount): void
    {
        DB::transaction(function () use ($chartOfAccount) {
            app(ChartOfAccountService::class)->deactivateLinkedAccount($chartOfAccount);
        });
    }

    public function restored(ChartOfAccount $chartOfAccount): void
    {
        DB::transaction(function () use ($chartOfAccount) {
            app(ChartOfAccountService::class)->syncLinkedAccount($chartOfAccount);
        });
    }
}