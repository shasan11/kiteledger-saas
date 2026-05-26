<?php
use Inertia\Inertia;

Route::prefix('crm')->name('crm.')->group(function () {
    Route::get('/', fn () => Inertia::render('App/Crm/Home/Index'))->name('home');
    Route::get('/dashboard', fn () => Inertia::render('App/Crm/Home/Index'))->name('dashboard');
    Route::get('/contact-groups', fn () => Inertia::render('App/Crm/ContactGroups/Index'))->name('contact-groups.index');
    Route::get('/contact-groups/{id}', fn (string $id) => Inertia::render('App/Crm/ContactGroups/Show', ['id' => $id]))->name('contact-groups.show');
    Route::get('/contacts', fn () => Inertia::render('App/Crm/Contacts/Index'))->name('contacts.index');
    Route::get('/contacts/{id}', fn (string $id) => Inertia::render('App/Crm/Contacts/Show', ['id' => $id]))->name('contacts.show');
    Route::get('/leads', fn () => Inertia::render('App/Crm/Leads/Index'))->name('leads.index');
    Route::get('/leads/{id}', fn (string $id) => Inertia::render('App/Crm/Leads/Show', ['id' => $id]))->name('leads.show');
    Route::get('/deals', fn () => Inertia::render('App/Crm/Deals/Index'))->name('deals.index');
    Route::get('/deals/{id}', fn (string $id) => Inertia::render('App/Crm/Deals/Show', ['id' => $id]))->name('deals.show');
    Route::get('/activity-inbox', fn () => Inertia::render('App/Crm/ActivityInbox/Index'))->name('activity-inbox.index');
    Route::get('/projects', fn () => Inertia::render('App/Crm/Projects/Index'))->name('projects.index');
    Route::get('/activities', fn () => Inertia::render('App/Crm/Activities/Index'))->name('activities.index');
    Route::get('/activities/{id}', fn (string $id) => Inertia::render('App/Crm/Activities/Show', ['id' => $id]))->name('activities.show');
    Route::get('/campaigns', fn () => Inertia::render('App/Crm/Campaigns/Index'))->name('campaigns.index');
    Route::get('/campaigns/{id}', fn (string $id) => Inertia::render('App/Crm/Campaigns/Show', ['id' => $id]))->name('campaigns.show');
    Route::get('/tickets', fn () => Inertia::render('App/Support/Tickets/Index'))->middleware('can:support.ticket.view')->name('tickets.index');
    Route::get('/tickets/{id}', fn (string $id) => Inertia::render('App/Support/Tickets/Show', ['id' => $id]))->middleware('can:support.ticket.view')->name('tickets.show');
});
