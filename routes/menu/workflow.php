<?php
use Inertia\Inertia;


Route::get('/workflow', fn () => Inertia::render('App/Workflow/Index'))->name('workflow.index');
