<?php
use Inertia\Inertia;

Route::prefix('crm')->name('crm.')->group(function () {
    Route::get('/contact-groups', fn () => Inertia::render('App/Crm/ContactGroups/Index'))->name('contact-groups.index');
    Route::get('/contacts', fn () => Inertia::render('App/Crm/Contacts/Index'))->name('contacts.index');
    Route::get('/deals', fn () => Inertia::render('App/Crm/Deals/Index'))->name('deals.index');
    Route::get('/projects', fn () => Inertia::render('App/Crm/Projects/Index'))->name('projects.index');
    Route::get('/activities', fn () => Inertia::render('App/Crm/Activities/Index'))->name('activities.index');
});
