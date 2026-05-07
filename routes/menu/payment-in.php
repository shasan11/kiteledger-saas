<?php
use Inertia\Inertia;

Route::prefix('payment-in')->name('payment-in.')->group(function () {
    Route::get('/quotations', fn () => Inertia::render('App/PaymentIn/Quotations/Index'))->name('quotations.index');
    Route::get('/quotations/{id}', fn ($id) => Inertia::render('App/PaymentIn/Quotations/Show', ['id' => $id]))->name('quotations.show');
    Route::get('/bills', fn () => Inertia::render('App/PaymentIn/Bills/Index'))->name('bills.index');
    Route::get('/bills/{id}', fn ($id) => Inertia::render('App/PaymentIn/Bills/Show', ['id' => $id]))->name('bills.show');
    Route::get('/proforma-invoices', fn () => Inertia::render('App/PaymentIn/ProformaInvoices/Index'))->name('proforma-invoices.index');
    Route::get('/proforma-invoices/{id}', fn ($id) => Inertia::render('App/PaymentIn/ProformaInvoices/Show', ['id' => $id]))->name('proforma-invoices.show');
    Route::get('/sales-orders', fn () => Inertia::render('App/PaymentIn/SalesOrder/Index'))->name('sales-orders.index');
    Route::get('/sales-orders/{id}', fn ($id) => Inertia::render('App/PaymentIn/SalesOrder/Show', ['id' => $id]))->name('sales-orders.show');
    Route::get('/invoices', fn () => Inertia::render('App/PaymentIn/Invoices/Index'))->name('invoices.index');
    Route::get('/invoices/{id}', fn ($id) => Inertia::render('App/PaymentIn/Invoices/Show', ['id' => $id]))->name('invoices.show');
    Route::get('/payments', fn () => Inertia::render('App/PaymentIn/Payments/Index'))->name('payments.index');
    Route::get('/payments/{id}', fn ($id) => Inertia::render('App/PaymentIn/Payments/Show', ['id' => $id]))->name('payments.show');
    Route::get('/credit-notes', fn () => Inertia::render('App/PaymentIn/CreditNotes/Index'))->name('credit-notes.index');
    Route::get('/credit-notes/{id}', fn ($id) => Inertia::render('App/PaymentIn/CreditNotes/Show', ['id' => $id]))->name('credit-notes.show');
    Route::get('/customers', fn () => Inertia::render('App/PaymentIn/Customers/Index'))->name('customers.index');
});
