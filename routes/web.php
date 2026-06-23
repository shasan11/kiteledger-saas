<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Documents\DocumentUploadPageController;
use App\Http\Controllers\LocalizationController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// The web installer is the Froiden package (routes registered by its service
// provider under /install). EnsureInstalled (bootstrap/app.php) redirects an
// un-installed deployment there.

// Note: GET /storage/{path} is served by Laravel's built-in route (named
// storage.public, registered because the "public" disk has 'serve' => true in
// config/filesystems.php). That makes uploaded images work even when the
// public/storage symlink is missing — the installer also clears away any
// broken symlink so requests actually reach this route. No custom route needed.

Route::redirect('/', '/dashboard')->name('home');

Route::post('/locale/change', [LocalizationController::class, 'change'])
    ->name('locale.change');

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::prefix('localization')->name('localization.')->group(function () {
        Route::get('/languages', [LocalizationController::class, 'index'])->name('languages.index');
        Route::post('/languages', [LocalizationController::class, 'store'])->name('languages.store');
        Route::put('/languages/{language}', [LocalizationController::class, 'update'])->name('languages.update');
        Route::delete('/languages/{language}', [LocalizationController::class, 'destroy'])->name('languages.destroy');
        Route::get('/languages/{language}/translations', [LocalizationController::class, 'translations'])->name('translations.index');
        Route::put('/languages/{language}/translations', [LocalizationController::class, 'updateTranslations'])->name('translations.update');
        Route::post('/languages/{language}/translations/import', [LocalizationController::class, 'importTranslations'])->name('translations.import');
    });

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
    require __DIR__.'/menu/configurations.php';
    require __DIR__.'/menu/master.php';
    require __DIR__.'/menu/tax.php';
    require __DIR__.'/menu/settings.php';

    // AI module — canonical assistant page (legacy pages removed)

    // Document Upload module
    Route::get('/documents/upload', [DocumentUploadPageController::class, 'index'])->name('documents.upload.index');
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
