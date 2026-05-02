<?php

namespace App\Observers;

use App\Models\BankAccount;
use App\Services\Accounting\AccountSyncService;
use Illuminate\Support\Facades\DB;

class BankAccountObserver
{
    public function __construct(protected AccountSyncService $accountSyncService)
    {
    }

    public function saving(BankAccount $bankAccount): void
    {
        $this->accountSyncService->prepareBankAccountBeforeSave($bankAccount);
    }

    public function saved(BankAccount $bankAccount): void
    {
        $this->accountSyncService->syncBankAccount($bankAccount);
    }

    public function deleting(BankAccount $bankAccount): void
    {
        DB::transaction(function () use ($bankAccount): void {
            if ($bankAccount->account_id) {
                $this->accountSyncService->deactivateLinkedAccount($bankAccount->account_id);

                \App\Models\ChartOfAccount::query()
                    ->where('account_id', $bankAccount->account_id)
                    ->update(['active' => false]);
            }
        });
    }
}
