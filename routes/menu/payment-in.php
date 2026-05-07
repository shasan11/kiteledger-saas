<?php
use Inertia\Inertia;

Route::prefix('payment-in')->name('payment-in.')->group(function () {
    Route::get('/quotations', fn () => Inertia::render('App/PaymentIn/Quotations/Index'))->name('quotations.index');
    Route::get('/bills', fn () => Inertia::render('App/PaymentIn/Bills/Index'))->name('bills.index');
    Route::get('/proforma-invoices', fn () => Inertia::render('App/PaymentIn/ProformaInvoices/Index'))->name('proforma-invoices.index');
    Route::get('/sales-orders', fn () => Inertia::render('App/PaymentIn/SalesOrder/Index'))->name('sales-orders.index');
    Route::get('/invoices', fn () => Inertia::render('App/PaymentIn/Invoices/Index'))->name('invoices.index');
    Route::get('/payments', fn () => Inertia::render('App/PaymentIn/Payments/Index'))->name('payments.index');
    Route::get('/credit-notes', fn () => Inertia::render('App/PaymentIn/CreditNotes/Index'))->name('credit-notes.index');
    Route::get('/customers', fn () => Inertia::render('App/PaymentIn/Customers/Index'))->name('customers.index');
});
