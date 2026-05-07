<?php
use Inertia\Inertia;

Route::prefix('settings')->name('settings.')->group(function () {
    Route::get('/', fn () => Inertia::render('App/Settings/Index'))->name('index');
    Route::get('/company-profile', fn () => Inertia::render('App/Settings/CompanyProfile'))->name('company-profile');
    Route::get('/localization', fn () => Inertia::render('App/Settings/CompanyProfile'))->name('localization');
    Route::get('/branches', fn () => Inertia::render('App/Master/Branches/Index'))->name('branches.index');
    Route::get('/fiscal-years', fn () => Inertia::render('App/Settings/FiscalYears'))->name('fiscal-years.index');
    Route::get('/currencies', fn () => Inertia::render('App/Master/Currencies/Index'))->name('currencies.index');
    Route::get('/taxes', fn () => Inertia::render('App/Tax/TaxRates/Index'))->name('taxes.index');
    Route::get('/approval-workflows', fn () => Inertia::render('App/Settings/ApprovalWorkflows'))->name('approval-workflows.index');
    Route::get('/email-configuration', fn () => Inertia::render('App/Hrm/EmailConfigs/Index'))->name('email-configuration.index');
    Route::get('/email-templates', fn () => Inertia::render('App/Settings/EmailTemplates'))->name('email-templates.index');
    Route::get('/accounting-configuration', fn () => Inertia::render('App/Settings/ConfigurationForm', ['area' => 'accounting']))->name('accounting-configuration');
    Route::get('/hrm-configuration', fn () => Inertia::render('App/Settings/ConfigurationForm', ['area' => 'hrm']))->name('hrm-configuration');
    Route::get('/inventory-configuration', fn () => Inertia::render('App/Settings/ConfigurationForm', ['area' => 'inventory']))->name('inventory-configuration');
    Route::get('/sales-configuration', fn () => Inertia::render('App/Settings/ConfigurationForm', ['area' => 'sales']))->name('sales-configuration');
    Route::get('/purchase-configuration', fn () => Inertia::render('App/Settings/ConfigurationForm', ['area' => 'purchase']))->name('purchase-configuration');
    Route::get('/users', fn () => Inertia::render('App/Hrm/Users/Index'))->name('users.index');
    Route::get('/roles', fn () => Inertia::render('App/Hrm/Roles/Index'))->name('roles.index');
    Route::get('/permissions', fn () => Inertia::render('App/Hrm/Permissions/Index'))->name('permissions.index');
    Route::get('/alert-types', fn () => Inertia::render('App/Settings/AlertTypes/Index'))->name('alert-types.index');
    Route::get('/reporting-tags', fn () => Inertia::render('App/Settings/ReportingTags/Index'))->name('reporting-tags.index');
    Route::get('/document-numberings', fn () => Inertia::render('App/Settings/DocumentNumberings/Index'))->name('document-numberings.index');
    Route::get('/printing-templates', fn () => Inertia::render('App/Settings/PrintingTemplates/Index'))->name('printing-templates.index');
    Route::get('/custom-templates', fn () => Inertia::render('App/Settings/CustomTemplates/Index'))->name('custom-templates.index');
    Route::get('/application-settings', fn () => Inertia::render('App/Settings/ApplicationSettings/Index'))->name('application-settings.index');
    Route::get('/general-settings', fn () => Inertia::render('App/Settings/GeneralSettings/Index'))->name('general-settings.index');
    Route::get('/master-data', fn () => Inertia::render('App/Settings/MasterData/Index'))->name('master-data.index');
});
