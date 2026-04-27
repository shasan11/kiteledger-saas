<?php

use App\Http\Controllers\Accounting\ChartOfAccountsController;
use App\Http\Controllers\Accounting\JournalVouchersController;
use App\Http\Controllers\AccountingController;

Route::prefix('accounting')->name('accounting.')->group(function () {
    Route::get('/chart-of-accounts', [ChartOfAccountsController::class, 'index'])->name('chart-of-accounts.index');
    Route::get('/bank-accounts', [AccountingController::class, 'bankAccounts'])->name('bank-accounts.index');
    Route::get('/cash-transfers', [AccountingController::class, 'cashTransfers'])->name('cash-transfers.index');
    Route::get('/journal-vouchers', [JournalVouchersController::class, 'index'])->name('journal-vouchers.index');
    Route::get('/journal-voucher-lines', [JournalVouchersController::class, 'lines'])->name('journal-voucher-lines.index');
    Route::get('/quick-bills', [AccountingController::class, 'quickBills'])->name('quick-bills.index');
    Route::get('/quick-receipts', [AccountingController::class, 'quickReceipts'])->name('quick-receipts.index');
    Route::get('/fixed-assets', [AccountingController::class, 'fixedAssets'])->name('fixed-assets.index');
    Route::get('/loan-accounts', [AccountingController::class, 'loanAccounts'])->name('loan-accounts.index');
});
