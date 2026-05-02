<?php

use Inertia\Inertia;

Route::prefix('human-resource')->name('human-resource.')->group(function () {
    Route::get('/employees', fn () => Inertia::render('App/HumanResource/Employees/Index'))->name('employees.index');
    Route::get('/departments', fn () => Inertia::render('App/HumanResource/Departments/Index'))->name('departments.index');
    Route::get('/designations', fn () => Inertia::render('App/HumanResource/Designations/Index'))->name('designations.index');
    Route::get('/attendance', fn () => Inertia::render('App/HumanResource/Attendance/Index'))->name('attendance.index');
    Route::get('/leaves', fn () => Inertia::render('App/HumanResource/Leaves/Index'))->name('leaves.index');
    Route::get('/payroll', fn () => Inertia::render('App/HumanResource/Payroll/Index'))->name('payroll.index');
});
