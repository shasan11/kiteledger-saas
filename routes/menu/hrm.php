<?php

Route::prefix('hrm')->name('hrm.')->group(function () {
    Route::get('/employees', fn () => Inertia::render('App/Hrm/Employees/Index'))->name('employees.index');
    Route::get('/departments', fn () => Inertia::render('App/Hrm/Departments/Index'))->name('departments.index');
    Route::get('/designations', fn () => Inertia::render('App/Hrm/Designations/Index'))->name('designations.index');
    Route::get('/attendance', fn () => Inertia::render('App/Hrm/Attendance/Index'))->name('attendance.index');
    Route::get('/leaves', fn () => Inertia::render('App/Hrm/Leaves/Index'))->name('leaves.index');
    Route::get('/payroll', fn () => Inertia::render('App/Hrm/Payroll/Index'))->name('payroll.index');
});
