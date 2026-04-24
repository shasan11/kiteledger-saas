<?php

Route::prefix('accounting')->name('accounting.')->group(function () {
    Route::get('/chart-of-accounts', fn () => Inertia::render('App/Accounting/ChartOfAccounts/Index'))->name('chart-of-accounts.index');
    Route::get('/bank-accounts', fn () => Inertia::render('App/Accounting/BankAccounts/Index'))->name('bank-accounts.index');
    Route::get('/cash-transfers', fn () => Inertia::render('App/Accounting/CashTransfers/Index'))->name('cash-transfers.index');
    Route::get('/journal-vouchers', fn () => Inertia::render('App/Accounting/JournalVouchers/Index'))->name('journal-vouchers.index');
    Route::get('/quick-bills', fn () => Inertia::render('App/Accounting/QuickBills/Index'))->name('quick-bills.index');
    Route::get('/quick-receipts', fn () => Inertia::render('App/Accounting/QuickReceipts/Index'))->name('quick-receipts.index');
    Route::get('/fixed-assets', fn () => Inertia::render('App/Accounting/FixedAssets/Index'))->name('fixed-assets.index');
    Route::get('/loan-accounts', fn () => Inertia::render('App/Accounting/LoanAccounts/Index'))->name('loan-accounts.index');
});
