<?php

use Inertia\Inertia;

Route::prefix('sales')->name('sales.')->group(function () {
    Route::get('/quotations', fn () => Inertia::render('App/Sales/Quotations/Index'))->name('quotations.index');
    Route::get('/sales-orders', fn () => Inertia::render('App/Sales/SalesOrders/Index'))->name('sales-orders.index');
    Route::get('/proforma-invoices', fn () => Inertia::render('App/Sales/ProformaInvoices/Index'))->name('proforma-invoices.index');
    Route::get('/invoices', fn () => Inertia::render('App/Sales/Invoices/Index'))->name('invoices.index');
    Route::get('/customer-payments', fn () => Inertia::render('App/Sales/CustomerPayments/Index'))->name('customer-payments.index');
    Route::get('/sales-returns', fn () => Inertia::render('App/Sales/SalesReturns/Index'))->name('sales-returns.index');
});
