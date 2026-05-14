<?php
use Inertia\Inertia;

Route::prefix('crm')->name('crm.')->group(function () {
    Route::get('/', fn () => Inertia::render('App/Crm/Home/Index'))->name('home');
    Route::get('/contact-groups', fn () => Inertia::render('App/Crm/ContactGroups/Index'))->name('contact-groups.index');
    Route::get('/contact-groups/{id}', fn (string $id) => Inertia::render('App/Crm/ContactGroups/Show', ['id' => $id]))->name('contact-groups.show');
    Route::get('/accounts', fn () => Inertia::render('App/Crm/Accounts/Index'))->name('accounts.index');
    Route::get('/accounts/{id}', fn (string $id) => Inertia::render('App/Crm/Customer360/Index', ['id' => $id]))->name('accounts.show');
    Route::get('/contacts', fn () => Inertia::render('App/Crm/Contacts/Index'))->name('contacts.index');
    Route::get('/contacts/{id}', fn (string $id) => Inertia::render('App/Crm/Contacts/Show', ['id' => $id]))->name('contacts.show');
    Route::get('/leads', fn () => Inertia::render('App/Crm/Leads/Index'))->name('leads.index');
    Route::get('/leads/{id}', fn (string $id) => Inertia::render('App/Crm/Leads/Show', ['id' => $id]))->name('leads.show');
    Route::get('/deals', fn () => Inertia::render('App/Crm/Deals/Index'))->name('deals.index');
    Route::get('/deals/{id}', fn (string $id) => Inertia::render('App/Crm/Deals/Show', ['id' => $id]))->name('deals.show');
    Route::get('/activity-inbox', fn () => Inertia::render('App/Crm/ActivityInbox/Index'))->name('activity-inbox.index');
    Route::get('/forecast', fn () => Inertia::render('App/Crm/Forecast/Index'))->name('forecast.index');
    Route::get('/campaigns', fn () => Inertia::render('App/Crm/Campaigns/Index'))->name('campaigns.index');
    Route::get('/communications', fn () => Inertia::render('App/Crm/Communications/Index'))->name('communications.index');
    Route::get('/configuration', fn () => Inertia::render('App/Crm/Configuration/Index'))->name('configuration.index');
    Route::get('/projects', fn () => Inertia::render('App/Crm/Projects/Index'))->name('projects.index');
    Route::get('/activities', fn () => Inertia::render('App/Crm/Activities/Index'))->name('activities.index');
    Route::get('/activities/{id}', fn (string $id) => Inertia::render('App/Crm/Activities/Show', ['id' => $id]))->name('activities.show');
});
