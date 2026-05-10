<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::prefix('settings')->name('settings.')->group(function () {
    Route::get('/', fn () => Inertia::render('App/Settings/Index'))->name('index');

    Route::get('/company-profile', fn () => redirect()->route('settings.index', ['tab' => 'company-profile']))->name('company-profile');
    Route::get('/localization', fn () => redirect()->route('settings.index', ['tab' => 'localization']))->name('localization');
    Route::get('/branches', fn () => redirect()->route('settings.index', ['tab' => 'branches']))->name('branches.index');
    Route::get('/fiscal-years', fn () => redirect()->route('settings.index', ['tab' => 'fiscal-years']))->name('fiscal-years.index');
    Route::get('/currencies', fn () => redirect()->route('settings.index', ['tab' => 'currencies']))->name('currencies.index');
    Route::get('/taxes', fn () => redirect()->route('settings.index', ['tab' => 'taxes']))->name('taxes.index');
    Route::get('/approval-workflows', fn () => redirect()->route('settings.index', ['tab' => 'approval-workflows']))->name('approval-workflows.index');
    Route::get('/email-configuration', fn () => redirect()->route('settings.index', ['tab' => 'email-configuration']))->name('email-configuration.index');
    Route::get('/email-templates', fn () => redirect()->route('settings.index', ['tab' => 'email-templates']))->name('email-templates.index');

    Route::get('/accounting-configuration', fn () => redirect()->route('settings.index', ['tab' => 'accounting-configuration']))->name('accounting-configuration');
    Route::get('/hrm-configuration', fn () => redirect()->route('settings.index', ['tab' => 'hrm-configuration']))->name('hrm-configuration');
    Route::get('/inventory-configuration', fn () => redirect()->route('settings.index', ['tab' => 'inventory-configuration']))->name('inventory-configuration');
    Route::get('/sales-configuration', fn () => redirect()->route('settings.index', ['tab' => 'sales-configuration']))->name('sales-configuration');
    Route::get('/purchase-configuration', fn () => redirect()->route('settings.index', ['tab' => 'purchase-configuration']))->name('purchase-configuration');

    Route::get('/users', fn () => redirect()->route('settings.index', ['tab' => 'users']))->name('users.index');
    Route::get('/roles', fn () => redirect()->route('settings.index', ['tab' => 'roles']))->name('roles.index');
    Route::get('/permissions', fn () => redirect()->route('settings.index', ['tab' => 'permissions']))->name('permissions.index');
    Route::get('/alert-types', fn () => redirect()->route('settings.index', ['tab' => 'alert-types']))->name('alert-types.index');
    Route::get('/reporting-tags', fn () => redirect()->route('settings.index', ['tab' => 'reporting-tags']))->name('reporting-tags.index');
    Route::get('/document-numberings', fn () => redirect()->route('settings.index', ['tab' => 'document-numberings']))->name('document-numberings.index');
    Route::get('/printing-templates', fn () => redirect()->route('settings.index', ['tab' => 'printing-templates']))->name('printing-templates.index');
    Route::get('/custom-templates', fn () => redirect()->route('settings.index', ['tab' => 'custom-templates']))->name('custom-templates.index');
    Route::get('/application-settings', fn () => redirect()->route('settings.index', ['tab' => 'application-settings']))->name('application-settings.index');
    Route::get('/general-settings', fn () => redirect()->route('settings.index', ['tab' => 'general-settings']))->name('general-settings.index');
    Route::get('/master-data', fn () => redirect()->route('settings.index', ['tab' => 'master-data']))->name('master-data.index');
});