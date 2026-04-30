<?php
use Inertia\Inertia;

Route::prefix('tax')->name('tax.')->group(function () {
    Route::get('/tax-classes', fn () => Inertia::render('App/Tax/TaxClasses/Index'))->name('tax-classes.index');
    Route::get('/tax-rates', fn () => Inertia::render('App/Tax/TaxRates/Index'))->name('tax-rates.index');
});
