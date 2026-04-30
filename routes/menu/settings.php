<?php
use Inertia\Inertia;

Route::prefix('settings')->name('settings.')->group(function () {
    Route::get('/alert-types', fn () => Inertia::render('App/Settings/AlertTypes/Index'))->name('alert-types.index');
    Route::get('/reporting-tags', fn () => Inertia::render('App/Settings/ReportingTags/Index'))->name('reporting-tags.index');
    Route::get('/document-numberings', fn () => Inertia::render('App/Settings/DocumentNumberings/Index'))->name('document-numberings.index');
    Route::get('/printing-templates', fn () => Inertia::render('App/Settings/PrintingTemplates/Index'))->name('printing-templates.index');
    Route::get('/custom-templates', fn () => Inertia::render('App/Settings/CustomTemplates/Index'))->name('custom-templates.index');
    Route::get('/application-settings', fn () => Inertia::render('App/Settings/ApplicationSettings/Index'))->name('application-settings.index');
    Route::get('/general-settings', fn () => Inertia::render('App/Settings/GeneralSettings/Index'))->name('general-settings.index');
    Route::get('/master-data', fn () => Inertia::render('App/Settings/MasterData/Index'))->name('master-data.index');
});
