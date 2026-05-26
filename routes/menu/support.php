<?php
use Inertia\Inertia;

Route::prefix('support')->name('support.')->group(function () {
    Route::get('/tickets', fn () => Inertia::render('App/Support/Tickets/Index'))->middleware('can:support.ticket.view')->name('tickets.index');
    Route::get('/tickets/{id}', fn ($id) => Inertia::render('App/Support/Tickets/Show', ['id' => $id]))->middleware('can:support.ticket.view')->name('tickets.show');
});
