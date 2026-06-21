<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Documents\DocumentUploadPageController;
use App\Http\Controllers\Install\InstallController;
use App\Http\Controllers\LocalizationController;
use App\Http\Controllers\ProfileController;
use App\Http\Middleware\RedirectIfInstalled;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

/*
| Web installer (/install). Runs only when the app is not installed.
| Protected by RedirectIfInstalled; install POST routes are CSRF-exempt
| (see bootstrap/app.php) since the wizard runs before login/session setup.
| Requires a valid APP_KEY in .env — copy .env.example to .env first.
*/
Route::prefix('install')
    ->middleware(RedirectIfInstalled::class)
    ->group(function () {
        Route::get('/', [InstallController::class, 'index'])->name('install.index');
        Route::get('/requirements', [InstallController::class, 'requirements'])->name('install.requirements');
        Route::post('/database', [InstallController::class, 'testDatabase'])->name('install.database');
        Route::post('/run', [InstallController::class, 'run'])->name('install.run');
    });

Route::get('/storage/{path}', function (string $path) {
    abort_if(str_contains($path, '..') || str_starts_with($path, '/'), 404);
    abort_unless(Storage::disk('public')->exists($path), 404);

    return Storage::disk('public')->response($path);
})->where('path', '.*')->name('public.storage');

Route::get('/', function () {
    return redirect()->route('dashboard');
})->name('home');

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
