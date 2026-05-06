<?php

use Inertia\Inertia;

Route::prefix('sales')->name('sales.')->group(function () {
    Route::get('/quotations', fn () => Inertia::render('App/Sales/Quotations/Index'))->name('quotations.index');
    Route::get('/quotations/{id}', fn ($id) => Inertia::render('App/Sales/Quotations/Show', ['id' => $id]))->name('quotations.show');
    Route::get('/sales-orders', fn () => Inertia::render('App/Sales/SalesOrders/Index'))->name('sales-orders.index');
    Route::get('/sales-orders/{id}', fn ($id) => Inertia::render('App/Sales/SalesOrders/Show', ['id' => $id]))->name('sales-orders.show');
    Route::get('/proforma-invoices', fn () => Inertia::render('App/Sales/ProformaInvoices/Index'))->name('proforma-invoices.index');
    Route::get('/proforma-invoices/{id}', fn ($id) => Inertia::render('App/Sales/ProformaInvoices/Show', ['id' => $id]))->name('proforma-invoices.show');
    Route::get('/invoices', fn () => Inertia::render('App/Sales/Invoices/Index'))->name('invoices.index');
    Route::get('/invoices/{id}', fn ($id) => Inertia::render('App/Sales/Invoices/Show', ['id' => $id]))->name('invoices.show');
    Route::get('/customer-payments', fn () => Inertia::render('App/Sales/CustomerPayments/Index'))->name('customer-payments.index');
    Route::get('/customer-payments/{id}', fn ($id) => Inertia::render('App/Sales/CustomerPayments/Show', ['id' => $id]))->name('customer-payments.show');
    Route::get('/sales-returns', fn () => Inertia::render('App/Sales/SalesReturns/Index'))->name('sales-returns.index');
    Route::get('/sales-returns/{id}', fn ($id) => Inertia::render('App/Sales/SalesReturns/Show', ['id' => $id]))->name('sales-returns.show');
});
