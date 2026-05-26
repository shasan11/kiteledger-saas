<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('dashboard');
})->name('home');

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard-data', DashboardController::class)->name('dashboard.data');

    require __DIR__.'/menu/pos.php';
    require __DIR__.'/menu/crm.php';
    require __DIR__.'/menu/support.php';
    require __DIR__.'/menu/workflow.php';
    require __DIR__.'/menu/payment-in.php';
    require __DIR__.'/menu/payment-out.php';
    require __DIR__.'/menu/accounting.php';
    require __DIR__.'/menu/inventory.php';
    require __DIR__.'/menu/warehouse.php';
    require __DIR__.'/menu/human-resource.php';
    require __DIR__.'/menu/hrm.php';
    require __DIR__.'/menu/reports.php';
    require __DIR__.'/menu/online-store.php';
    require __DIR__.'/menu/configurations.php';
    require __DIR__.'/menu/master.php';
    require __DIR__.'/menu/tax.php';
    require __DIR__.'/menu/settings.php';

    // AI module standalone pages
    Route::get('/ai/logs', fn () => Inertia::render('App/AI/Logs'))->name('ai.logs');
    Route::get('/ai/command-center', fn () => Inertia::render('App/AI/CommandCenter'))->name('ai.command-center');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Public invoice payment pages — no auth required
Route::prefix('pay/invoice')->name('pay.invoice.')->group(function () {
    Route::get('{token}', fn ($token) => Inertia::render('Public/InvoicePayment/Show', ['token' => $token]))->name('show');
    Route::get('{token}/success', fn ($token) => Inertia::render('Public/InvoicePayment/Success', ['token' => $token]))->name('success');
    Route::get('{token}/cancel', fn ($token) => Inertia::render('Public/InvoicePayment/Failed', ['token' => $token, 'reason' => 'cancelled']))->name('cancel');
    Route::get('{token}/failed', fn ($token) => Inertia::render('Public/InvoicePayment/Failed', ['token' => $token, 'reason' => 'failed']))->name('failed');
});

// Admin: payment gateway settings page
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/settings/payment-gateways', fn () => Inertia::render('App/Settings/PaymentGateways/Index'))->name('settings.payment-gateways.index');
    Route::get('/payments/online', fn () => Inertia::render('App/Payments/OnlinePayments/Index'))->name('payments.online.index');
    Route::get('/payments/online/{id}', fn ($id) => Inertia::render('App/Payments/OnlinePayments/Show', ['id' => $id]))->name('payments.online.show');
});

require __DIR__.'/auth.php';