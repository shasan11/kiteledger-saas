<?php
use Inertia\Inertia;

Route::prefix('payment-in')->name('payment-in.')->group(function () {
    Route::get('/quotations', fn () => Inertia::render('App/PaymentIn/Quotations/Index'))->name('quotations.index');
    Route::get('/quotations/add', fn () => Inertia::render('App/PaymentIn/Quotations/Add'))->name('quotations.add');
    Route::get('/quotations/{id}/edit', fn ($id) => Inertia::render('App/PaymentIn/Quotations/Edit', ['id' => $id]))->name('quotations.edit');
    Route::get('/quotations/{id}', fn ($id) => Inertia::render('App/PaymentIn/Quotations/Show', ['id' => $id]))->name('quotations.show');

    Route::get('/bills', fn () => redirect()->route('payment-in.invoices.index'))->name('bills.index');
    Route::get('/bills/add', fn () => redirect()->route('payment-in.invoices.add'))->name('bills.add');
    Route::get('/bills/{id}/edit', fn ($id) => redirect()->route('payment-in.invoices.edit', $id))->name('bills.edit');
    Route::get('/bills/{id}', fn ($id) => redirect()->route('payment-in.invoices.show', $id))->name('bills.show');

    Route::get('/proforma-invoices', fn () => Inertia::render('App/PaymentIn/ProformaInvoices/Index'))->name('proforma-invoices.index');
    Route::get('/proforma-invoices/{id}', fn ($id) => Inertia::render('App/PaymentIn/ProformaInvoices/Show', ['id' => $id]))->name('proforma-invoices.show');

    Route::get('/sales-orders', fn () => Inertia::render('App/PaymentIn/SalesOrder/Index'))->name('sales-orders.index');
    Route::get('/sales-orders/add', fn () => Inertia::render('App/PaymentIn/SalesOrder/Add'))->name('sales-orders.add');
    Route::get('/sales-orders/{id}/edit', fn ($id) => Inertia::render('App/PaymentIn/SalesOrder/Edit', ['id' => $id]))->name('sales-orders.edit');
    Route::get('/sales-orders/{id}', fn ($id) => Inertia::render('App/PaymentIn/SalesOrder/Show', ['id' => $id]))->name('sales-orders.show');

    Route::get('/invoices', fn () => Inertia::render('App/PaymentIn/Invoices/Index'))->name('invoices.index');
    Route::get('/invoices/add', fn () => Inertia::render('App/PaymentIn/Invoices/Add'))->name('invoices.add');
    Route::get('/invoices/{id}/edit', fn ($id) => Inertia::render('App/PaymentIn/Invoices/Edit', ['id' => $id]))->name('invoices.edit');
    Route::get('/invoices/{id}', fn ($id) => Inertia::render('App/PaymentIn/Invoices/Show', ['id' => $id]))->name('invoices.show');

    Route::get('/payments', fn () => Inertia::render('App/PaymentIn/Payments/Index'))->name('payments.index');
    Route::get('/payments/add', fn () => Inertia::render('App/PaymentIn/Payments/Add'))->name('payments.add');
    Route::get('/payments/{id}/edit', fn ($id) => Inertia::render('App/PaymentIn/Payments/Edit', ['id' => $id]))->name('payments.edit');
    Route::get('/payments/{id}', fn ($id) => Inertia::render('App/PaymentIn/Payments/Show', ['id' => $id]))->name('payments.show');

    Route::get('/credit-notes', fn () => Inertia::render('App/PaymentIn/CreditNotes/Index'))->name('credit-notes.index');
    Route::get('/credit-notes/add', fn () => Inertia::render('App/PaymentIn/CreditNotes/Add'))->name('credit-notes.add');
    Route::get('/credit-notes/{id}/edit', fn ($id) => Inertia::render('App/PaymentIn/CreditNotes/Edit', ['id' => $id]))->name('credit-notes.edit');
    Route::get('/credit-notes/{id}', fn ($id) => Inertia::render('App/PaymentIn/CreditNotes/Show', ['id' => $id]))->name('credit-notes.show');

});
