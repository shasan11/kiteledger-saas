<?php
use Inertia\Inertia;

Route::prefix('configurations')->name('configurations.')->group(function () {
    Route::get('/application', fn () => Inertia::render('App/Configurations/Application/Index'))->name('application.index');
    Route::get('/users-permission', fn () => Inertia::render('App/Configurations/UsersPermission/Index'))->name('users-permission.index');
    Route::get('/import-export', fn () => Inertia::render('App/Configurations/ImportExport/Index'))->name('import-export.index');
    Route::get('/organization', fn () => Inertia::render('App/Configurations/Organization/Index'))->name('organization.index');
    Route::get('/subscription', fn () => Inertia::render('App/Configurations/Subscription/Index'))->name('subscription.index');
});
