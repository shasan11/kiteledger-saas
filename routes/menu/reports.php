<?php

Route::get('/reports', fn () => Inertia::render('App/Reports/Index'))->name('reports.index');
