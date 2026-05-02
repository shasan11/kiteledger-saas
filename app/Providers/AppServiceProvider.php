<?php

namespace App\Providers;

use App\Models\BankAccount;
use App\Models\ChartOfAccount;
use App\Observers\BankAccountObserver;
use App\Observers\ChartOfAccountObserver;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        ChartOfAccount::observe(ChartOfAccountObserver::class);
        BankAccount::observe(BankAccountObserver::class);
    }
}
