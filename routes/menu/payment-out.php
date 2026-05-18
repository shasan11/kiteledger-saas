<?php
use Inertia\Inertia;

Route::prefix('payment-out')->name('payment-out.')->group(function () {
    Route::get('/purchase-bills', fn () => Inertia::render('App/PaymentOut/PurchaseBills/Index'))->name('purchase-bills.index');
    Route::get('/purchase-bills/add', fn () => Inertia::render('App/PaymentOut/PurchaseBills/Add'))->name('purchase-bills.add');
    Route::get('/purchase-bills/{id}/edit', fn ($id) => Inertia::render('App/PaymentOut/PurchaseBills/Edit', ['id' => $id]))->name('purchase-bills.edit');
    Route::get('/purchase-bills/{id}', fn ($id) => Inertia::render('App/PaymentOut/PurchaseBills/Show', ['id' => $id]))->name('purchase-bills.show');

    Route::get('/supplier-payments', fn () => Inertia::render('App/PaymentOut/SupplierPayments/Index'))->name('supplier-payments.index');
    Route::get('/supplier-payments/add', fn () => Inertia::render('App/PaymentOut/SupplierPayments/Add'))->name('supplier-payments.add');
    Route::get('/supplier-payments/{id}/edit', fn ($id) => Inertia::render('App/PaymentOut/SupplierPayments/Edit', ['id' => $id]))->name('supplier-payments.edit');
    Route::get('/supplier-payments/{id}', fn ($id) => Inertia::render('App/PaymentOut/SupplierPayments/Show', ['id' => $id]))->name('supplier-payments.show');

    Route::get('/payments', fn () => redirect()->route('payment-out.supplier-payments.index'))->name('payments.index');
    Route::get('/payments/{id}', fn ($id) => redirect()->route('payment-out.supplier-payments.show', $id))->name('payments.show');

    Route::get('/purchase-orders', fn () => Inertia::render('App/PaymentOut/PurchaseOrders/Index'))->name('purchase-orders.index');
    Route::get('/purchase-orders/add', fn () => Inertia::render('App/PaymentOut/PurchaseOrders/Add'))->name('purchase-orders.add');
    Route::get('/purchase-orders/{id}/edit', fn ($id) => Inertia::render('App/PaymentOut/PurchaseOrders/Edit', ['id' => $id]))->name('purchase-orders.edit');
    Route::get('/purchase-orders/{id}', fn ($id) => Inertia::render('App/PaymentOut/PurchaseOrders/Show', ['id' => $id]))->name('purchase-orders.show');

    Route::get('/expenses', fn () => Inertia::render('App/PaymentOut/Expenses/Index'))->name('expenses.index');
    Route::get('/expenses/add', fn () => Inertia::render('App/PaymentOut/Expenses/Add'))->name('expenses.add');
    Route::get('/expenses/{id}/edit', fn ($id) => Inertia::render('App/PaymentOut/Expenses/Edit', ['id' => $id]))->name('expenses.edit');
    Route::get('/expenses/{id}', fn ($id) => Inertia::render('App/PaymentOut/Expenses/Show', ['id' => $id]))->name('expenses.show');

    Route::get('/debit-notes', fn () => Inertia::render('App/PaymentOut/DebitNotes/Index'))->name('debit-notes.index');
    Route::get('/debit-notes/add', fn () => Inertia::render('App/PaymentOut/DebitNotes/Add'))->name('debit-notes.add');
    Route::get('/debit-notes/{id}/edit', fn ($id) => Inertia::render('App/PaymentOut/DebitNotes/Edit', ['id' => $id]))->name('debit-notes.edit');
    Route::get('/debit-notes/{id}', fn ($id) => Inertia::render('App/PaymentOut/DebitNotes/Show', ['id' => $id]))->name('debit-notes.show');
});
