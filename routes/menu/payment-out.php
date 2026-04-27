<?php
use Inertia\Inertia;

Route::prefix('payment-out')->name('payment-out.')->group(function () {
    Route::get('/purchase-bills', fn () => Inertia::render('App/PaymentOut/PurchaseBills/Index'))->name('purchase-bills.index');
    Route::get('/payments', fn () => Inertia::render('App/PaymentOut/Payments/Index'))->name('payments.index');
    Route::get('/purchase-orders', fn () => Inertia::render('App/PaymentOut/PurchaseOrders/Index'))->name('purchase-orders.index');
    Route::get('/expenses', fn () => Inertia::render('App/PaymentOut/Expenses/Index'))->name('expenses.index');
    Route::get('/debit-notes', fn () => Inertia::render('App/PaymentOut/DebitNotes/Index'))->name('debit-notes.index');
});
