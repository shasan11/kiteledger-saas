<?php
use Inertia\Inertia;

Route::prefix('pos')->name('pos.')->group(function () {
    Route::get('/', fn () => Inertia::render('App/Pos/TerminalSelection'))->middleware('can:pos.terminal.view')->name('index');
    Route::get('/screen', fn () => Inertia::render('App/Pos/SalesScreen'))->middleware('can:pos.sale.create')->name('screen');
    Route::get('/sales', fn () => Inertia::render('App/Pos/Sales'))->middleware('can:pos.sale.view')->name('sales.index');
    Route::get('/sales/{id}', fn ($id) => Inertia::render('App/Pos/SaleShow', ['id' => $id]))->middleware('can:pos.sale.view')->name('sales.show');
    Route::get('/shifts', fn () => Inertia::render('App/Pos/Shifts'))->middleware('can:pos.shift.view')->name('shifts.index');
    Route::get('/shifts/{id}', fn ($id) => Inertia::render('App/Pos/ShiftClosingSummary', ['id' => $id]))->middleware('can:pos.shift.view')->name('shifts.show');
    Route::get('/shifts/{id}/closing-summary', fn ($id) => Inertia::render('App/Pos/ShiftClosingSummary', ['id' => $id]))->middleware('can:pos.shift.view')->name('shifts.closing-summary');
    Route::get('/terminals', fn () => Inertia::render('App/Pos/Terminals'))->middleware('can:pos.terminal.view')->name('terminals.index');
    Route::get('/cash-movements', fn () => Inertia::render('App/Pos/CashMovements'))->middleware('can:pos.cash_movement.view')->name('cash-movements.index');
    Route::get('/returns', fn () => Inertia::render('App/Pos/Returns'))->middleware('can:pos.return.view')->name('returns.index');
});
