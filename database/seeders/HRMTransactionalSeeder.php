<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\Award;
use App\Models\AwardHistory;
use App\Models\Branch;
use App\Models\Designation;
use App\Models\DesignationHistory;
use App\Models\Education;
use App\Models\EmployeeDocument;
use App\Models\EmploymentStatus;
use App\Models\LeaveApplication;
use App\Models\LeavePolicy;
use App\Models\OnboardingChecklist;
use App\Models\Payslip;
use App\Models\PublicHoliday;
use App\Models\SalaryHistory;
use App\Models\Shift;
use App\Models\User;
use App\Models\WeeklyHoliday;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class HRMTransactionalSeeder extends Seeder
{
    public function run(): void
    {
        // NOTE: an early `return;` below stops this seeder after the public
        // holidays — the demo-employee block is intentionally dead code. The
        // old `PRAGMA foreign_keys = OFF` workaround for those inserts was
        // SQLite-only syntax and crashed MySQL installs (error 1064), so it is
        // removed: nothing that actually runs here violates a foreign key.

        $branch          = Branch::first();
        $branchId        = $branch?->id;
        $adminUser       = User::first();
        $adminId         = $adminUser?->id;

        $fullTimeStatus  = EmploymentStatus::where('name', 'Full Time')->first();
        $probationStatus = EmploymentStatus::where('name', 'Probation')->first();
        $partTimeStatus  = EmploymentStatus::where('name', 'Part Time')->first();

        $hrDept    = \App\Models\Department::where('name', 'HR')->first();
        $itDept    = \App\Models\Department::where('name', 'IT')->first();
        $finDept   = \App\Models\Department::where('name', 'Finance')->first();
        $salesDept = \App\Models\Department::where('name', 'Sales')->first();
        $mgmtDept  = \App\Models\Department::where('name', 'Management')->first();

        $shift      = Shift::where('name', 'General Shift')->first();
        $leavePolicy = LeavePolicy::where('name', 'Standard Leave Policy')->first();
        $weeklyHol  = WeeklyHoliday::first();

        $devDesig    = Designation::where('name', 'Developer')->first();
        $hrDesig     = Designation::where('name', 'HR Officer')->first();
        $mgrDesig    = Designation::where('name', 'Manager')->first();
        $acctDesig   = Designation::where('name', 'Accountant')->first();
        $salesDesig  = Designation::where('name', 'Sales Executive')->first();
        $ceoDesig    = Designation::where('name', 'CEO')->first();

        // ── Public Holidays ────────────────────────────────────────────────
        $publicHolidays = [
            ['name' => 'New Year Day',     'date' => '2025-01-01'],
            ['name' => 'Labor Day',        'date' => '2025-05-01'],
            ['name' => 'Independence Day', 'date' => '2025-08-15'],
            ['name' => 'Christmas Day',    'date' => '2025-12-25'],
        ];
        foreach ($publicHolidays as $ph) {
            PublicHoliday::updateOrCreate(
                ['name' => $ph['name']],
                array_merge($ph, ['active' => true, 'user_add_id' => $adminId])
            );
        }

        // ── Demo Employees ─────────────────────────────────────────────────
        // Keep demo seeding lean: the full-access admin is the only seeded employee.
        return;

        $employees = [
            [
                'first_name' => 'Sarah', 'last_name' => 'Johnson',
                'username' => 'sarah.johnson', 'email' => 'sarah.johnson@company.com',
                'phone' => '+1-555-0101', 'employee_id' => 'EMP-0001',
                'join_date' => '2023-01-15', 'blood_group' => 'B+',
                'employment_status_id' => $fullTimeStatus?->id,
                'department_id' => $hrDept?->id, 'shift_id' => $shift?->id,
                'leave_policy_id' => $leavePolicy?->id, 'weekly_holiday_id' => $weeklyHol?->id,
                'street' => '123 Main St', 'city' => 'New York', 'state' => 'NY', 'country' => 'USA',
                'salary' => 5500, 'desig_id' => $hrDesig?->id,
            ],
            [
                'first_name' => 'Michael', 'last_name' => 'Chen',
                'username' => 'michael.chen', 'email' => 'michael.chen@company.com',
                'phone' => '+1-555-0102', 'employee_id' => 'EMP-0002',
                'join_date' => '2022-06-01', 'blood_group' => 'O+',
                'employment_status_id' => $fullTimeStatus?->id,
                'department_id' => $itDept?->id, 'shift_id' => $shift?->id,
                'leave_policy_id' => $leavePolicy?->id, 'weekly_holiday_id' => $weeklyHol?->id,
                'street' => '456 Oak Ave', 'city' => 'San Francisco', 'state' => 'CA', 'country' => 'USA',
                'salary' => 8000, 'desig_id' => $devDesig?->id,
            ],
            [
                'first_name' => 'Emily', 'last_name' => 'Rodriguez',
                'username' => 'emily.rodriguez', 'email' => 'emily.rodriguez@company.com',
                'phone' => '+1-555-0103', 'employee_id' => 'EMP-0003',
                'join_date' => '2023-09-10', 'blood_group' => 'A+',
                'employment_status_id' => $probationStatus?->id,
                'department_id' => $finDept?->id, 'shift_id' => $shift?->id,
                'leave_policy_id' => $leavePolicy?->id, 'weekly_holiday_id' => $weeklyHol?->id,
                'street' => '789 Pine Rd', 'city' => 'Chicago', 'state' => 'IL', 'country' => 'USA',
                'salary' => 4200, 'desig_id' => $acctDesig?->id,
            ],
            [
                'first_name' => 'James', 'last_name' => 'Williams',
                'username' => 'james.williams', 'email' => 'james.williams@company.com',
                'phone' => '+1-555-0104', 'employee_id' => 'EMP-0004',
                'join_date' => '2021-03-01', 'blood_group' => 'AB+',
                'employment_status_id' => $fullTimeStatus?->id,
                'department_id' => $salesDept?->id, 'shift_id' => $shift?->id,
                'leave_policy_id' => $leavePolicy?->id, 'weekly_holiday_id' => $weeklyHol?->id,
                'street' => '321 Elm St', 'city' => 'Dallas', 'state' => 'TX', 'country' => 'USA',
                'salary' => 6000, 'desig_id' => $salesDesig?->id,
            ],
            [
                'first_name' => 'Lisa', 'last_name' => 'Thompson',
                'username' => 'lisa.thompson', 'email' => 'lisa.thompson@company.com',
                'phone' => '+1-555-0105', 'employee_id' => 'EMP-0005',
                'join_date' => '2020-07-15', 'blood_group' => 'O-',
                'employment_status_id' => $fullTimeStatus?->id,
                'department_id' => $mgmtDept?->id, 'shift_id' => $shift?->id,
                'leave_policy_id' => $leavePolicy?->id, 'weekly_holiday_id' => $weeklyHol?->id,
                'street' => '654 Maple Dr', 'city' => 'Seattle', 'state' => 'WA', 'country' => 'USA',
                'salary' => 12000, 'desig_id' => $mgrDesig?->id,
            ],
        ];

        $createdUsers = [];
        foreach ($employees as $emp) {
            $desigId = $emp['desig_id'];
            $salary  = $emp['salary'];
            unset($emp['desig_id'], $emp['salary']);

            $user = User::updateOrCreate(
                ['email' => $emp['email']],
                array_merge($emp, [
                    'name'                 => trim(($emp['first_name'] ?? '') . ' ' . ($emp['last_name'] ?? '')),
                    'password'             => Hash::make('password'),
                    'branch_id'            => $branchId,
                    'active'               => true,
                    'is_system_generated'  => true,
                    'user_add_id'          => $adminId,
                ])
            );

            $createdUsers[] = [
                'user'    => $user,
                'desigId' => $desigId,
                'salary'  => $salary,
            ];
        }

        // ── Salary Histories ───────────────────────────────────────────────
        foreach ($createdUsers as $data) {
            $user   = $data['user'];
            $salary = $data['salary'];
            $join   = Carbon::parse($user->join_date ?? '2022-01-01');

            SalaryHistory::updateOrCreate(
                ['user_id' => $user->id, 'start_date' => $join->format('Y-m-d')],
                [
                    'salary'              => $salary * 0.85,
                    'end_date'            => $join->copy()->addYear()->subDay()->format('Y-m-d'),
                    'comment'             => 'Initial salary',
                    'active'              => true,
                    'is_system_generated' => true,
                    'user_add_id'         => $adminId,
                ]
            );

            SalaryHistory::updateOrCreate(
                ['user_id' => $user->id, 'start_date' => $join->copy()->addYear()->format('Y-m-d')],
                [
                    'salary'              => $salary,
                    'end_date'            => null,
                    'comment'             => 'Annual increment',
                    'active'              => true,
                    'is_system_generated' => true,
                    'user_add_id'         => $adminId,
                ]
            );
        }

        // ── Designation Histories ──────────────────────────────────────────
        foreach ($createdUsers as $data) {
            $user    = $data['user'];
            $desigId = $data['desigId'];
            if (!$desigId) continue;
            $join = Carbon::parse($user->join_date ?? '2022-01-01');

            DesignationHistory::updateOrCreate(
                ['user_id' => $user->id, 'designation_id' => $desigId, 'start_date' => $join->format('Y-m-d')],
                [
                    'end_date'            => null,
                    'comment'             => 'Current designation',
                    'active'              => true,
                    'is_system_generated' => true,
                    'user_add_id'         => $adminId,
                ]
            );
        }

        // ── Attendance ─────────────────────────────────────────────────────
        $statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'PRESENT', 'ABSENT', 'PRESENT'];
        foreach ($createdUsers as $i => $data) {
            $user = $data['user'];
            for ($day = 6; $day >= 0; $day--) {
                $date      = Carbon::now()->subDays($day)->startOfDay();
                $dayOfWeek = $date->dayOfWeek;
                if ($dayOfWeek === 6) continue; // skip Saturday

                $status  = $statuses[$day % count($statuses)];
                $inTime  = $date->copy()->setHour(9)->setMinute($status === 'LATE' ? rand(20, 50) : rand(0, 10));
                $outTime = $date->copy()->setHour(18)->setMinute(rand(0, 30));

                Attendance::updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'in_time' => $inTime->format('Y-m-d H:i:s'),
                    ],
                    [
                        'out_time'            => $outTime->format('Y-m-d H:i:s'),
                        'branch_id'           => $branchId,
                        'total_hour'          => 8.5,
                        'in_time_status'      => $status,
                        'out_time_status'     => 'PRESENT',
                        'active'              => true,
                        'is_system_generated' => true,
                        'user_add_id'         => $adminId,
                    ]
                );
            }
        }

        // ── Leave Applications ─────────────────────────────────────────────
        $leaveData = [
            ['days_from_now' => -30, 'days' => 3, 'status' => 'APPROVED'],
            ['days_from_now' => -10, 'days' => 1, 'status' => 'APPROVED'],
            ['days_from_now' => 5,   'days' => 2, 'status' => 'PENDING'],
            ['days_from_now' => 20,  'days' => 5, 'status' => 'PENDING'],
        ];

        foreach ($createdUsers as $i => $data) {
            $user = $data['user'];
            $leaves = array_slice($leaveData, 0, 2 + ($i % 3));
            foreach ($leaves as $leave) {
                $from = Carbon::now()->addDays($leave['days_from_now'])->format('Y-m-d');
                $to   = Carbon::now()->addDays($leave['days_from_now'] + $leave['days'] - 1)->format('Y-m-d');

                LeaveApplication::updateOrCreate(
                    ['user_id' => $user->id, 'leave_from' => $from],
                    [
                        'branch_id'           => $branchId,
                        'leave_to'            => $to,
                        'leave_type'          => $leavePolicy ? $leavePolicy->name : 'Annual Leave',
                        'leave_duration'      => $leave['days'],
                        'reason'              => 'Personal work',
                        'status'              => $leave['status'],
                        'active'              => true,
                        'is_system_generated' => true,
                        'user_add_id'         => $adminId,
                    ]
                );
            }
        }

        // ── Payslips ───────────────────────────────────────────────────────
        $months = [
            ['month' => 2, 'year' => 2025, 'status' => 'PAID'],
            ['month' => 3, 'year' => 2025, 'status' => 'PAID'],
            ['month' => 4, 'year' => 2025, 'status' => 'UNPAID'],
        ];

        foreach ($createdUsers as $data) {
            $user   = $data['user'];
            $salary = $data['salary'];
            foreach ($months as $m) {
                Payslip::updateOrCreate(
                    ['user_id' => $user->id, 'salary_month' => $m['month'], 'salary_year' => $m['year']],
                    [
                        'branch_id'           => $branchId,
                        'salary'              => $salary,
                        'paid_leave'          => 0,
                        'unpaid_leave'        => 0,
                        'monthly_holiday'     => 4,
                        'public_holiday'      => 1,
                        'work_day'            => 22,
                        'shift_wise_work_hour' => 8,
                        'monthly_work_hour'   => 176,
                        'hourly_salary'       => round($salary / 176, 2),
                        'working_hour'        => 176,
                        'salary_payable'      => $salary,
                        'bonus'               => $m['status'] === 'PAID' ? round($salary * 0.1, 2) : 0,
                        'bonus_comment'       => $m['status'] === 'PAID' ? 'Performance bonus' : null,
                        'deduction'           => 0,
                        'total_payable'       => $m['status'] === 'PAID' ? $salary + round($salary * 0.1, 2) : $salary,
                        'payment_status'      => $m['status'],
                        'active'              => true,
                        'is_system_generated' => true,
                        'user_add_id'         => $adminId,
                    ]
                );
            }
        }

        // ── Education ─────────────────────────────────────────────────────
        $educationData = [
            ['degree' => 'B.Sc. Computer Science', 'institution' => 'MIT', 'field_of_study' => 'Computer Science', 'result' => '3.8 GPA', 'start' => '2016-09-01', 'end' => '2020-05-30'],
            ['degree' => 'MBA',                     'institution' => 'Harvard Business School', 'field_of_study' => 'Business Administration', 'result' => 'Distinction', 'start' => '2020-09-01', 'end' => '2022-05-30'],
            ['degree' => 'B.Com',                   'institution' => 'State University', 'field_of_study' => 'Commerce', 'result' => 'First Class', 'start' => '2015-09-01', 'end' => '2018-05-30'],
            ['degree' => 'B.Sc. Finance',            'institution' => 'City University', 'field_of_study' => 'Finance', 'result' => '3.5 GPA', 'start' => '2017-09-01', 'end' => '2021-05-30'],
            ['degree' => 'BBA Marketing',            'institution' => 'Business School', 'field_of_study' => 'Marketing', 'result' => 'Second Class', 'start' => '2018-09-01', 'end' => '2022-05-30'],
        ];

        foreach ($createdUsers as $i => $data) {
            $user = $data['user'];
            $edu  = $educationData[$i % count($educationData)];
            Education::updateOrCreate(
                ['user_id' => $user->id, 'degree' => $edu['degree']],
                [
                    'institution'         => $edu['institution'],
                    'field_of_study'      => $edu['field_of_study'],
                    'result'              => $edu['result'],
                    'study_start_date'    => $edu['start'],
                    'study_end_date'      => $edu['end'],
                    'active'              => true,
                    'is_system_generated' => true,
                    'user_add_id'         => $adminId,
                ]
            );
        }

        // ── Award Histories ────────────────────────────────────────────────
        $eomAward  = Award::where('name', 'Employee of the Month')->first();
        $bestAward = Award::where('name', 'Best Performer')->first();

        if ($eomAward && count($createdUsers) > 0) {
            $user = $createdUsers[0]['user'];
            AwardHistory::updateOrCreate(
                ['user_id' => $user->id, 'award_id' => $eomAward->id, 'awarded_date' => '2025-03-01'],
                [
                    'comment'             => 'Outstanding performance in Q1',
                    'active'              => true,
                    'is_system_generated' => true,
                    'user_add_id'         => $adminId,
                ]
            );
        }
        if ($bestAward && count($createdUsers) > 1) {
            $user = $createdUsers[1]['user'];
            AwardHistory::updateOrCreate(
                ['user_id' => $user->id, 'award_id' => $bestAward->id, 'awarded_date' => '2025-04-01'],
                [
                    'comment'             => 'Best developer of the quarter',
                    'active'              => true,
                    'is_system_generated' => true,
                    'user_add_id'         => $adminId,
                ]
            );
        }

        // ── Employee Documents ─────────────────────────────────────────────
        $docTypes = [
            ['title' => 'National ID',     'document_type' => 'National ID',   'issue_date' => '2020-01-01', 'expiry_date' => '2030-01-01'],
            ['title' => 'Passport',         'document_type' => 'Passport',      'issue_date' => '2021-06-01', 'expiry_date' => '2026-06-01'],
            ['title' => 'Driving License',  'document_type' => 'License',       'issue_date' => '2019-03-01', 'expiry_date' => '2025-03-01'], // expired-ish
            ['title' => 'Work Certificate', 'document_type' => 'Certificate',   'issue_date' => '2023-01-15', 'expiry_date' => null],
            ['title' => 'Degree Certificate','document_type' => 'Education',    'issue_date' => '2022-07-01', 'expiry_date' => null],
        ];

        foreach ($createdUsers as $i => $data) {
            $user = $data['user'];
            $doc  = $docTypes[$i % count($docTypes)];
            EmployeeDocument::updateOrCreate(
                ['user_id' => $user->id, 'title' => $doc['title']],
                [
                    'branch_id'           => $branchId,
                    'document_type'       => $doc['document_type'],
                    'file_path'           => null,
                    'issue_date'          => $doc['issue_date'],
                    'expiry_date'         => $doc['expiry_date'],
                    'notes'               => 'Auto-seeded document',
                    'active'              => true,
                    'is_system_generated' => true,
                    'user_add_id'         => $adminId,
                ]
            );
        }

        // ── Onboarding Checklists ──────────────────────────────────────────
        $onboardingTasks = [
            ['title' => 'Complete joining forms',         'status' => 'COMPLETED'],
            ['title' => 'Set up workstation and accounts','status' => 'COMPLETED'],
            ['title' => 'Meet team members',              'status' => 'COMPLETED'],
            ['title' => 'Complete compliance training',   'status' => 'IN_PROGRESS'],
            ['title' => 'Review company handbook',        'status' => 'PENDING'],
        ];
        $offboardingTasks = [
            ['title' => 'Hand over responsibilities',     'status' => 'PENDING'],
            ['title' => 'Return company equipment',       'status' => 'PENDING'],
            ['title' => 'Complete exit interview',        'status' => 'PENDING'],
        ];

        // Seed onboarding for first 3 employees
        foreach (array_slice($createdUsers, 0, 3) as $data) {
            $user = $data['user'];
            foreach ($onboardingTasks as $task) {
                OnboardingChecklist::updateOrCreate(
                    ['user_id' => $user->id, 'type' => 'ONBOARDING', 'title' => $task['title']],
                    [
                        'branch_id'           => $branchId,
                        'description'         => 'Standard onboarding task',
                        'assigned_to'         => $adminId,
                        'due_date'            => Carbon::parse($user->join_date ?? now())->addDays(7),
                        'completed_at'        => $task['status'] === 'COMPLETED' ? Carbon::parse($user->join_date ?? now())->addDays(5) : null,
                        'status'              => $task['status'],
                        'active'              => true,
                        'is_system_generated' => true,
                        'user_add_id'         => $adminId,
                    ]
                );
            }
        }

        // Seed offboarding for last employee (if resign scenario)
        if (count($createdUsers) > 0) {
            $user = end($createdUsers)['user'];
            foreach ($offboardingTasks as $task) {
                OnboardingChecklist::updateOrCreate(
                    ['user_id' => $user->id, 'type' => 'OFFBOARDING', 'title' => $task['title']],
                    [
                        'branch_id'           => $branchId,
                        'description'         => 'Standard offboarding task',
                        'assigned_to'         => $adminId,
                        'due_date'            => Carbon::now()->addDays(14),
                        'completed_at'        => null,
                        'status'              => $task['status'],
                        'active'              => true,
                        'is_system_generated' => true,
                        'user_add_id'         => $adminId,
                    ]
                );
            }
        }
    }
}
