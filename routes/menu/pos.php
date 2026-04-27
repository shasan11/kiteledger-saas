<?php
use Inertia\Inertia;

Route::get('/pos', fn () => Inertia::render('App/Pos/Index'))->name('pos.index');
