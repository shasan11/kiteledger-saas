<?php
use Inertia\Inertia;

Route::get('/warehouse', fn () => Inertia::render('App/Warehouse/Index'))->name('warehouse.index');
Route::get('/warehouse/{id}', fn ($id) => Inertia::render('App/Warehouse/Show', ['id' => $id]))->name('warehouse.show');
