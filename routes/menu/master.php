<?php
use Inertia\Inertia;

Route::prefix('master')->name('master.')->group(function () {
    Route::get('/branches', fn () => Inertia::render('App/Master/Branches/Index'))->name('branches.index');
    Route::get('/currencies', fn () => Inertia::render('App/Master/Currencies/Index'))->name('currencies.index');
    Route::get('/credit-terms', fn () => Inertia::render('App/Master/CreditTerms/Index'))->name('credit-terms.index');
});
