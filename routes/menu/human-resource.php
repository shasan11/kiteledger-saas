<?php

use Inertia\Inertia;

// Legacy routes (kept for backwards compatibility)
Route::prefix('human-resource')->name('human-resource.')->group(function () {
    Route::get('/employees',    fn () => Inertia::render('App/HumanResource/Employees/Index'))->name('employees.index');
    Route::get('/departments',  fn () => Inertia::render('App/HumanResource/Departments/Index'))->name('departments.index');
    Route::get('/designations', fn () => Inertia::render('App/HumanResource/Designations/Index'))->name('designations.index');
    Route::get('/attendance',   fn () => Inertia::render('App/HumanResource/Attendance/Index'))->name('attendance.index');
    Route::get('/leaves',       fn () => Inertia::render('App/HumanResource/Leaves/Index'))->name('leaves.index');
    Route::get('/payroll',      fn () => Inertia::render('App/HumanResource/Payroll/Index'))->name('payroll.index');
});

// Full HRM module routes
Route::prefix('hrm')->name('hrm.')->group(function () {

    // ── Workforce ──────────────────────────────────────────────────────────
    Route::get('/users',              fn () => Inertia::render('App/Hrm/Users/Index'))->name('users.index');
    Route::get('/attendance',         fn () => Inertia::render('App/Hrm/Attendance/Index'))->name('attendance.index');
    Route::get('/leave-applications', fn () => Inertia::render('App/Hrm/LeaveApplications/Index'))->name('leave-applications.index');
    Route::get('/payslips',           fn () => Inertia::render('App/Hrm/Payslips/Index'))->name('payslips.index');

    // ── Masters ────────────────────────────────────────────────────────────
    Route::get('/departments',         fn () => Inertia::render('App/Hrm/Departments/Index'))->name('departments.index');
    Route::get('/designations',        fn () => Inertia::render('App/Hrm/Designations/Index'))->name('designations.index');
    Route::get('/employment-statuses', fn () => Inertia::render('App/Hrm/EmploymentStatuses/Index'))->name('employment-statuses.index');
    Route::get('/leave-policies',      fn () => Inertia::render('App/Hrm/LeavePolicies/Index'))->name('leave-policies.index');
    Route::get('/weekly-holidays',     fn () => Inertia::render('App/Hrm/WeeklyHolidays/Index'))->name('weekly-holidays.index');
    Route::get('/shifts',              fn () => Inertia::render('App/Hrm/Shifts/Index'))->name('shifts.index');
    Route::get('/public-holidays',     fn () => Inertia::render('App/Hrm/PublicHolidays/Index'))->name('public-holidays.index');
    Route::get('/awards',              fn () => Inertia::render('App/Hrm/Awards/Index'))->name('awards.index');
    Route::get('/priorities',          fn () => Inertia::render('App/Hrm/Priorities/Index'))->name('priorities.index');

    // ── Histories ──────────────────────────────────────────────────────────
    Route::get('/salary-histories',      fn () => Inertia::render('App/Hrm/SalaryHistories/Index'))->name('salary-histories.index');
    Route::get('/designation-histories', fn () => Inertia::render('App/Hrm/DesignationHistories/Index'))->name('designation-histories.index');
    Route::get('/award-histories',       fn () => Inertia::render('App/Hrm/AwardHistories/Index'))->name('award-histories.index');
    Route::get('/educations',            fn () => Inertia::render('App/Hrm/Educations/Index'))->name('educations.index');

    // ── Access Control ─────────────────────────────────────────────────────
    Route::get('/roles',            fn () => Inertia::render('App/Hrm/Roles/Index'))->name('roles.index');
    Route::get('/permissions',      fn () => Inertia::render('App/Hrm/Permissions/Index'))->name('permissions.index');
    Route::get('/role-permissions', fn () => Inertia::render('App/Hrm/RolePermissions/Index'))->name('role-permissions.index');

    // ── Projects ───────────────────────────────────────────────────────────
    Route::get('/projects',             fn () => Inertia::render('App/Hrm/Projects/Index'))->name('projects.index');
    Route::get('/milestones',           fn () => Inertia::render('App/Hrm/Milestones/Index'))->name('milestones.index');
    Route::get('/tasks',                fn () => Inertia::render('App/Hrm/Tasks/Index'))->name('tasks.index');
    Route::get('/task-statuses',        fn () => Inertia::render('App/Hrm/TaskStatuses/Index'))->name('task-statuses.index');
    Route::get('/assigned-tasks',       fn () => Inertia::render('App/Hrm/AssignedTasks/Index'))->name('assigned-tasks.index');
    Route::get('/project-teams',        fn () => Inertia::render('App/Hrm/ProjectTeams/Index'))->name('project-teams.index');
    Route::get('/project-team-members', fn () => Inertia::render('App/Hrm/ProjectTeamMembers/Index'))->name('project-team-members.index');

    // ── Email ──────────────────────────────────────────────────────────────
    Route::get('/email-configs', fn () => Inertia::render('App/Hrm/EmailConfigs/Index'))->name('email-configs.index');
    Route::get('/emails',        fn () => Inertia::render('App/Hrm/Emails/Index'))->name('emails.index');
});
