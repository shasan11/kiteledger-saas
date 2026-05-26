<?php

use App\Http\Controllers\ReportsController;

Route::get('/reports', [ReportsController::class, 'index'])->name('reports.index');
Route::get('/reports/{category}/{slug}', [ReportsController::class, 'showReport'])
    ->where('category', 'accounting|receivable|payable|sales|purchase|tax|inventory|production|hr|system|analytics')
    ->name('reports.show');
