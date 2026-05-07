<?php
use Inertia\Inertia;

Route::prefix('pos')->name('pos.')->group(function () {
    Route::get('/', fn () => Inertia::render('App/Pos/Index'))->name('index');
    Route::get('/sales', fn () => Inertia::render('App/Pos/Sales'))->name('sales.index');
    Route::get('/sales/{id}', fn ($id) => Inertia::render('App/Pos/SaleShow', ['id' => $id]))->name('sales.show');
    Route::get('/shifts', fn () => Inertia::render('App/Pos/Shifts'))->name('shifts.index');
    Route::get('/terminals', fn () => Inertia::render('App/Pos/Terminals'))->name('terminals.index');
    Route::get('/cash-movements', fn () => Inertia::render('App/Pos/CashMovements'))->name('cash-movements.index');
    Route::get('/returns', fn () => Inertia::render('App/Pos/Returns'))->name('returns.index');
});
