<?php

Route::prefix('online-store')->name('online-store.')->group(function () {
    Route::get('/', fn () => Inertia::render('App/OnlineStore/Index'))->name('index');
    Route::get('/products', fn () => Inertia::render('App/OnlineStore/Products/Index'))->name('products.index');
    Route::get('/orders', fn () => Inertia::render('App/OnlineStore/Orders/Index'))->name('orders.index');
    Route::get('/customers', fn () => Inertia::render('App/OnlineStore/Customers/Index'))->name('customers.index');
    Route::get('/coupons', fn () => Inertia::render('App/OnlineStore/Coupons/Index'))->name('coupons.index');
});
