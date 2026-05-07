<?php
use Inertia\Inertia;

Route::prefix('payment-out')->name('payment-out.')->group(function () {
    Route::get('/purchase-bills', fn () => Inertia::render('App/PaymentOut/PurchaseBills/Index'))->name('purchase-bills.index');
    Route::get('/purchase-bills/{id}', fn ($id) => Inertia::render('App/Purchase/PurchaseBills/Show', ['id' => $id]))->name('purchase-bills.show');
    Route::get('/supplier-payments', fn () => Inertia::render('App/PaymentOut/SupplierPayments/Index'))->name('supplier-payments.index');
    Route::get('/supplier-payments/{id}', fn ($id) => Inertia::render('App/Purchase/SupplierPayments/Show', ['id' => $id]))->name('supplier-payments.show');
    Route::get('/payments', fn () => Inertia::render('App/PaymentOut/SupplierPayments/Index'))->name('payments.index');
    Route::get('/payments/{id}', fn ($id) => Inertia::render('App/Purchase/SupplierPayments/Show', ['id' => $id]))->name('payments.show');
    Route::get('/purchase-orders', fn () => Inertia::render('App/PaymentOut/PurchaseOrders/Index'))->name('purchase-orders.index');
    Route::get('/purchase-orders/{id}', fn ($id) => Inertia::render('App/Purchase/PurchaseOrders/Show', ['id' => $id]))->name('purchase-orders.show');
    Route::get('/expenses', fn () => Inertia::render('App/PaymentOut/Expenses/Index'))->name('expenses.index');
    Route::get('/expenses/{id}', fn ($id) => Inertia::render('App/Purchase/Expenses/Show', ['id' => $id]))->name('expenses.show');
    Route::get('/debit-notes', fn () => Inertia::render('App/PaymentOut/DebitNotes/Index'))->name('debit-notes.index');
    Route::get('/debit-notes/{id}', fn ($id) => Inertia::render('App/Purchase/DebitNotes/Show', ['id' => $id]))->name('debit-notes.show');
});
