<?php

use App\Http\Controllers\AccountingController;
use Inertia\Inertia;

Route::prefix('accounting')->name('accounting.')->group(function () {
    Route::get('/chart-of-accounts', [AccountingController::class, 'chartOfAccounts'])->name('chart-of-accounts.index');
    Route::get('/chart-of-accounts/{id}', fn (string $id) => Inertia::render('App/Accounting/ChartOfAccounts/Show', ['id' => $id]))->name('chart-of-accounts.show');
    Route::get('/bank-accounts', [AccountingController::class, 'bankAccounts'])->name('bank-accounts.index');
    Route::get('/bank-accounts/{id}', fn (string $id) => Inertia::render('App/Accounting/BankAccounts/Show', ['id' => $id]))->name('bank-accounts.show');
    Route::get('/cash-transfers', [AccountingController::class, 'cashTransfers'])->name('cash-transfers.index');
    Route::get('/cash-transfers/{id}', fn (string $id) => Inertia::render('App/Accounting/CashTransfers/Show', ['id' => $id]))->name('cash-transfers.show');
    Route::get('/cheque-registers', fn () => Inertia::render('App/Accounting/ChequeRegisters/Index'))->name('cheque-registers.index');
    Route::get('/journal-vouchers', [AccountingController::class, 'journalVouchers'])->name('journal-vouchers.index');
    Route::get('/journal-vouchers/{id}', fn (string $id) => Inertia::render('App/Accounting/JournalVouchers/Show', ['id' => $id]))->name('journal-vouchers.show');
    Route::get('/quick-bills', [AccountingController::class, 'quickBills'])->name('quick-bills.index');
    Route::get('/quick-receipts', [AccountingController::class, 'quickReceipts'])->name('quick-receipts.index');
    Route::get('/fixed-assets', [AccountingController::class, 'fixedAssets'])->name('fixed-assets.index');
    Route::get('/loan-accounts', [AccountingController::class, 'loanAccounts'])->name('loan-accounts.index');
    Route::get('/loan-accounts/{id}', fn (string $id) => Inertia::render('App/Accounting/LoanAccounts/Show', ['id' => $id]))->name('loan-accounts.show');
});
