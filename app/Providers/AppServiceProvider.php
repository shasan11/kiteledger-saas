<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

use App\Models\ChartOfAccount;
use App\Models\BankAccount;
use App\Models\CashTransfer;
use App\Models\CashTransferLine;
use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use App\Models\ChequeRegister;
use App\Models\LoanAccount;
use App\Models\LoanTopUp;
use App\Models\LoanCharge;

use App\Observers\ChartOfAccountObserver;
use App\Observers\BankAccountObserver;
use App\Observers\CashTransferObserver;
use App\Observers\CashTransferLineObserver;
use App\Observers\JournalVoucherObserver;
use App\Observers\JournalVoucherLineObserver;
use App\Observers\ChequeRegisterObserver;
use App\Observers\LoanAccountObserver;
use App\Observers\LoanTopUpObserver;
use App\Observers\LoanChargeObserver;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        ChartOfAccount::observe(ChartOfAccountObserver::class);
        BankAccount::observe(BankAccountObserver::class);

        CashTransfer::observe(CashTransferObserver::class);
        CashTransferLine::observe(CashTransferLineObserver::class);

        JournalVoucher::observe(JournalVoucherObserver::class);
        JournalVoucherLine::observe(JournalVoucherLineObserver::class);

        ChequeRegister::observe(ChequeRegisterObserver::class);

        LoanAccount::observe(LoanAccountObserver::class);
        LoanTopUp::observe(LoanTopUpObserver::class);
        LoanCharge::observe(LoanChargeObserver::class);
    }
}