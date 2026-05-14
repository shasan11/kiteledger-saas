<?php

use Inertia\Inertia;

Route::prefix('tax')->name('tax.')->group(function () {
    // Simple user-facing pages
    Route::get('/dashboard',  fn () => Inertia::render('App/Tax/Dashboard/Index'))->name('dashboard');
    Route::get('/settings',   fn () => Inertia::render('App/Tax/Settings/Index'))->name('settings');

    // Advanced tax setup (admin/accountant only)
    Route::get('/advanced',             fn () => Inertia::render('App/Tax/Advanced/Index'))->name('advanced');
    Route::get('/tax-classes',          fn () => Inertia::render('App/Tax/TaxClasses/Index'))->name('tax-classes.index');
    Route::get('/tax-rates',            fn () => Inertia::render('App/Tax/TaxRates/Index'))->name('tax-rates.index');
    Route::get('/tax-rules',            fn () => Inertia::render('App/Tax/TaxRules/Index'))->name('tax-rules.index');
    Route::get('/tax-exemptions',       fn () => Inertia::render('App/Tax/TaxExemptions/Index'))->name('tax-exemptions.index');
    Route::get('/tax-registrations',    fn () => Inertia::render('App/Tax/TaxRegistrations/Index'))->name('tax-registrations.index');
    Route::get('/tax-jurisdictions',    fn () => Inertia::render('App/Tax/TaxJurisdictions/Index'))->name('tax-jurisdictions.index');
    Route::get('/product-tax-categories', fn () => Inertia::render('App/Tax/ProductTaxCategories/Index'))->name('product-tax-categories.index');
});
