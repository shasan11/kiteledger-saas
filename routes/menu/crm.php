<?php
use Inertia\Inertia;

Route::prefix('crm')->name('crm.')->group(function () {
    Route::get('/contact-groups', fn () => Inertia::render('App/Crm/ContactGroups/Index'))->name('contact-groups.index');
    Route::get('/contacts', fn () => Inertia::render('App/Crm/Contacts/Index'))->name('contacts.index');
    Route::get('/contacts/{id}', fn (string $id) => Inertia::render('App/Crm/Contacts/Show', ['id' => $id]))->name('contacts.show');
    Route::get('/leads', fn () => Inertia::render('App/Crm/Leads/Index'))->name('leads.index');
    Route::get('/leads/{id}', fn (string $id) => Inertia::render('App/Crm/Leads/Show', ['id' => $id]))->name('leads.show');
    Route::get('/projects', fn () => Inertia::render('App/Crm/Projects/Index'))->name('projects.index');
    Route::get('/activities', fn () => Inertia::render('App/Crm/Activities/Index'))->name('activities.index');
});
