<?php

Route::get('/warehouse', fn () => Inertia::render('App/Warehouse/Index'))->name('warehouse.index');
