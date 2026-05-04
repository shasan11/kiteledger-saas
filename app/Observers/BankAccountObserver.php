<?php

namespace App\Observers;

use App\Models\BankAccount;
use App\Domain\Accounting\Services\BankAccountService;
use Illuminate\Support\Facades\DB;

class BankAccountObserver
{
    public function creating(BankAccount $bankAccount): void
    {
        app(BankAccountService::class)->assignCodeIfMissing($bankAccount);
    }

    public function saved(BankAccount $bankAccount): void
    {
        DB::transaction(function () use ($bankAccount) {
            app(BankAccountService::class)->syncLinkedAccount($bankAccount);
        });
    }

    public function deleted(BankAccount $bankAccount): void
    {
        DB::transaction(function () use ($bankAccount) {
            app(BankAccountService::class)->deactivateLinkedAccount($bankAccount);
        });
    }

    public function restored(BankAccount $bankAccount): void
    {
        DB::transaction(function () use ($bankAccount) {
            app(BankAccountService::class)->syncLinkedAccount($bankAccount);
        });
    }
}