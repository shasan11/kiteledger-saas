<?php

namespace Database\Seeders;

use App\Models\AssignedTask;
use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Contact;
use App\Models\CreditTerm;
use App\Models\CrmActivity;
use App\Models\Deal;
use App\Models\DealPipeline;
use App\Models\DealStage;
use App\Models\Department;
use App\Models\Designation;
use App\Models\DesignationHistory;
use App\Models\Education;
use App\Models\EmploymentStatus;
use App\Models\InventoryAdjustment;
use App\Models\InventoryAdjustmentLine;
use App\Models\LeaveApplication;
use App\Models\LeavePolicy;
use App\Models\Milestone;
use App\Models\Payslip;
use App\Models\Priority;
use App\Models\Product;
use App\Models\Project;
use App\Models\ProjectTeam;
use App\Models\ProjectTeamMember;
use App\Models\SalaryHistory;
use App\Models\Shift;
use App\Models\Task;
use App\Models\TaskStatus;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\WeeklyHoliday;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class ModuleDemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            MainBranchSeeder::class,
            BranchSeeder::class,
            MasterCurrencySeeder::class,
            CurrencySeeder::class,
            FiscalYearSeeder::class,
            MasterChartOfAccountSeeder::class,
            TaxSystemSeeder::class,
            MasterTaxJurisdictionSeeder::class,
            MasterProductDataSeeder::class,
            MasterHRMDataSeeder::class,
            MasterHRMAdditionalSeeder::class,
            MasterDealDataSeeder::class,
            MasterDataTypesSeeder::class,
        ]);

        $admin = User::query()->orderBy('id')->first();
        $branch = $this->mainBranch();

        $this->ensureWarehouse($branch, $admin);

        $this->call([
            ProductSeeder::class,
            HrmConfigurationSeeder::class,
            InventoryConfigurationSeeder::class,
        ]);

        $employees = $this->seedHrm($branch, $admin);
        $this->seedCrm($employees, $admin);
        $this->seedInventory($branch, $admin);
        $this->seedProjects($branch, $employees, $admin);
    }

    private function seedHrm(?Branch $branch, ?User $admin): array
    {
        $shift = Shift::query()->updateOrCreate(
            ['name' => 'General Shift'],
            $this->payload('shifts', [
                'start_time' => '09:00:00',
                'end_time' => '18:00:00',
                'work_hour' => 8,
                'active' => true,
                'is_system_generated' => true,
                'user_add_id' => $admin?->id,
            ])
        );

        $leavePolicy = LeavePolicy::query()->firstOrCreate(
            ['name' => 'Standard Leave Policy'],
            $this->payload('leave_policies', [
                'paid_leave_count' => 12,
                'unpaid_leave_count' => 0,
                'description' => 'Standard leave policy with 12 paid days per year',
                'active' => true,
                'is_system_generated' => true,
                'user_add_id' => $admin?->id,
            ])
        );

        $weeklyHoliday = WeeklyHoliday::query()->first();
        $fullTime = EmploymentStatus::query()->where('name', 'Full Time')->first();

        $employees = [
            [
                'first_name' => 'Maya',
                'last_name' => 'Shrestha',
                'email' => 'maya.shrestha.demo@kiteledger.local',
                'username' => 'maya.shrestha.demo',
                'employee_id' => 'DEMO-HRM-001',
                'phone' => '+9779800001001',
                'department' => 'HR',
                'designation' => 'HR Officer',
                'salary' => 68000,
                'city' => 'Kathmandu',
            ],
            [
                'first_name' => 'Aarav',
                'last_name' => 'Khanal',
                'email' => 'aarav.khanal.demo@kiteledger.local',
                'username' => 'aarav.khanal.demo',
                'employee_id' => 'DEMO-HRM-002',
                'phone' => '+9779800001002',
                'department' => 'Sales',
                'designation' => 'Sales Executive',
                'salary' => 72000,
                'city' => 'Lalitpur',
            ],
            [
                'first_name' => 'Nisha',
                'last_name' => 'Rai',
                'email' => 'nisha.rai.demo@kiteledger.local',
                'username' => 'nisha.rai.demo',
                'employee_id' => 'DEMO-HRM-003',
                'phone' => '+9779800001003',
                'department' => 'Operations',
                'designation' => 'Manager',
                'salary' => 95000,
                'city' => 'Bhaktapur',
            ],
        ];

        $created = [];

        foreach ($employees as $index => $employee) {
            $department = Department::query()->where('name', $employee['department'])->first();
            $designation = Designation::query()->where('name', $employee['designation'])->first();
            $joinDate = Carbon::now()->subMonths(9 - ($index * 2))->startOfMonth();

            $user = User::query()->updateOrCreate(
                ['email' => $employee['email']],
                $this->payload('users', [
                    'name' => "{$employee['first_name']} {$employee['last_name']}",
                    'first_name' => $employee['first_name'],
                    'last_name' => $employee['last_name'],
                    'username' => $employee['username'],
                    'password' => Hash::make('password'),
                    'branch_id' => $branch?->id,
                    'phone' => $employee['phone'],
                    'city' => $employee['city'],
                    'country' => 'Nepal',
                    'employee_id' => $employee['employee_id'],
                    'join_date' => $joinDate->toDateString(),
                    'employment_status_id' => $fullTime?->id,
                    'department_id' => $department?->id,
                    'shift_id' => $shift->id,
                    'leave_policy_id' => $leavePolicy->id,
                    'weekly_holiday_id' => $weeklyHoliday?->id,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $admin?->id,
                ])
            );

            $created[] = $user;

            SalaryHistory::query()->updateOrCreate(
                ['user_id' => $user->id, 'start_date' => $joinDate->toDateString()],
                $this->payload('salary_histories', [
                    'salary' => $employee['salary'],
                    'end_date' => null,
                    'comment' => 'Seeded current salary',
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $admin?->id,
                ])
            );

            if ($designation) {
                DesignationHistory::query()->updateOrCreate(
                    ['user_id' => $user->id, 'designation_id' => $designation->id, 'start_date' => $joinDate->toDateString()],
                    $this->payload('designation_histories', [
                        'end_date' => null,
                        'comment' => 'Seeded current designation',
                        'active' => true,
                        'is_system_generated' => true,
                        'user_add_id' => $admin?->id,
                    ])
                );
            }

            Education::query()->updateOrCreate(
                ['user_id' => $user->id, 'degree' => 'Bachelor of Business Administration'],
                $this->payload('educations', [
                    'institution' => 'KiteLedger Business College',
                    'field_of_study' => 'Business Operations',
                    'result' => 'First Division',
                    'study_start_date' => $joinDate->copy()->subYears(4)->toDateString(),
                    'study_end_date' => $joinDate->copy()->subYear()->toDateString(),
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $admin?->id,
                ])
            );

            for ($day = 4; $day >= 0; $day--) {
                $date = Carbon::now()->subDays($day);
                $inTime = $date->copy()->setTime(9, $index * 5);

                Attendance::query()->updateOrCreate(
                    ['user_id' => $user->id, 'in_time' => $inTime->toDateTimeString()],
                    $this->payload('attendances', [
                        'branch_id' => $branch?->id,
                        'out_time' => $date->copy()->setTime(18, 0)->toDateTimeString(),
                        'ip' => '127.0.0.1',
                        'comment' => 'Seeded demo attendance',
                        'punch_by' => $admin?->id,
                        'total_hour' => 8,
                        'in_time_status' => $index === 1 && $day === 1 ? 'LATE' : 'PRESENT',
                        'out_time_status' => 'PRESENT',
                        'active' => true,
                        'is_system_generated' => true,
                        'user_add_id' => $admin?->id,
                    ])
                );
            }

            LeaveApplication::query()->updateOrCreate(
                ['user_id' => $user->id, 'leave_from' => Carbon::now()->addDays(10 + $index)->toDateString()],
                $this->payload('leave_applications', [
                    'branch_id' => $branch?->id,
                    'leave_policy_id' => $leavePolicy->id,
                    'leave_type' => 'Annual Leave',
                    'leave_to' => Carbon::now()->addDays(10 + $index)->toDateString(),
                    'leave_duration' => 1,
                    'reason' => 'Seeded personal leave request',
                    'status' => $index === 0 ? 'APPROVED' : 'PENDING',
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $admin?->id,
                    'accept_leave_by' => $index === 0 ? $admin?->id : null,
                ])
            );

            Payslip::query()->updateOrCreate(
                ['employee_id' => $user->id, 'salary_month' => Carbon::now()->subMonth()->month, 'salary_year' => Carbon::now()->subMonth()->year],
                $this->payload('payslips', [
                    'branch_id' => $branch?->id,
                    'user_id' => $user->id,
                    'payslip_number' => 'DEMO-PAY-'.$employee['employee_id'],
                    'status' => 'approved',
                    'gross_earnings' => $employee['salary'],
                    'total_deductions' => 2500,
                    'net_payable' => $employee['salary'] - 2500,
                    'salary' => $employee['salary'],
                    'paid_leave' => 1,
                    'unpaid_leave' => 0,
                    'work_day' => 22,
                    'total_payable' => $employee['salary'] - 2500,
                    'payment_status' => $index === 2 ? 'UNPAID' : 'PAID',
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $admin?->id,
                ])
            );
        }

        return $created;
    }

    private function seedCrm(array $employees, ?User $admin): void
    {
        $owner = $employees[1] ?? $admin;
        $creditTerm = CreditTerm::query()->updateOrCreate(
            ['name' => 'Net 30'],
            $this->payload('credit_terms', [
                'days' => 30,
                'description' => 'Payment due within 30 days',
                'active' => true,
                'is_system_generated' => true,
                'user_add_id' => $admin?->id,
            ])
        );

        $pipeline = DealPipeline::query()->where('is_default', true)->first()
            ?: DealPipeline::query()->first();
        $qualified = $this->dealStage($pipeline, 'Qualified');
        $proposal = $this->dealStage($pipeline, 'Proposal Sent');
        $won = $this->dealStage($pipeline, 'Won');

        $contacts = collect([
            ['code' => 'CRM-DEMO-001', 'name' => 'Himalayan Outfitters', 'email' => 'procurement@himalayan-outfitters.test', 'phone' => '+9779801002001', 'type' => 'customer'],
            ['code' => 'CRM-DEMO-002', 'name' => 'Everest Retail Group', 'email' => 'accounts@everest-retail.test', 'phone' => '+9779801002002', 'type' => 'customer'],
            ['code' => 'CRM-DEMO-003', 'name' => 'Summit Tech Supplies', 'email' => 'sales@summit-supplies.test', 'phone' => '+9779801002003', 'type' => 'supplier'],
        ])->map(fn (array $contact) => Contact::query()->updateOrCreate(
            ['code' => $contact['code']],
            $this->payload('contacts', [
                'contact_type' => $contact['type'],
                'name' => $contact['name'],
                'address' => 'Kathmandu, Nepal',
                'phone' => $contact['phone'],
                'email' => $contact['email'],
                'accept_purchase' => $contact['type'] === 'supplier',
                'credit_term_id' => $creditTerm->id,
                'credit_limit' => 250000,
                'active' => true,
                'is_system_generated' => true,
                'user_add_id' => $admin?->id,
            ])
        ))->values();

        $leads = collect([
            ['no' => 'DEMO-LEAD-001', 'contact' => $contacts[0], 'name' => 'Office expansion purchase', 'value' => 185000, 'status' => 'qualified', 'priority' => 'high'],
            ['no' => 'DEMO-LEAD-002', 'contact' => $contacts[1], 'name' => 'Quarterly stock refresh', 'value' => 95000, 'status' => 'contacted', 'priority' => 'medium'],
        ])->map(fn (array $lead) => \App\Models\Lead::query()->updateOrCreate(
            ['lead_no' => $lead['no']],
            $this->payload('leads', [
                'contact_id' => $lead['contact']->id,
                'deal_pipeline_id' => $pipeline?->id,
                'assigned_to_id' => $owner?->id,
                'name' => $lead['name'],
                'company_name' => $lead['contact']->name,
                'email' => $lead['contact']->email,
                'phone' => $lead['contact']->phone,
                'city' => 'Kathmandu',
                'country' => 'Nepal',
                'lead_source' => 'Website enquiry',
                'industry' => 'Retail',
                'expected_value' => $lead['value'],
                'status' => $lead['status'],
                'priority' => $lead['priority'],
                'next_follow_up_date' => Carbon::now()->addDays(3)->toDateString(),
                'last_contacted_at' => Carbon::now()->subDay()->toDateTimeString(),
                'notes' => 'Seeded CRM demo lead',
                'active' => true,
                'is_system_generated' => true,
                'user_add_id' => $admin?->id,
            ])
        ))->values();

        $deals = collect([
            ['no' => 'DEMO-DEAL-001', 'lead' => $leads[0], 'stage' => $proposal, 'title' => 'Himalayan Outfitters - office setup', 'amount' => 185000, 'status' => 'open', 'probability' => 50],
            ['no' => 'DEMO-DEAL-002', 'lead' => $leads[1], 'stage' => $qualified, 'title' => 'Everest Retail - replenishment order', 'amount' => 95000, 'status' => 'open', 'probability' => 30],
            ['no' => 'DEMO-DEAL-003', 'lead' => null, 'stage' => $won, 'title' => 'Summit Tech - annual support', 'amount' => 72000, 'status' => 'won', 'probability' => 100],
        ])->map(fn (array $deal, int $index) => Deal::query()->updateOrCreate(
            ['deal_no' => $deal['no']],
            $this->payload('deals', [
                'lead_id' => $deal['lead']?->id,
                'contact_id' => ($deal['lead']?->contact_id) ?: $contacts[min($index, $contacts->count() - 1)]->id,
                'deal_pipeline_id' => $pipeline?->id,
                'deal_stage_id' => $deal['stage']?->id,
                'assigned_to_id' => $owner?->id,
                'title' => $deal['title'],
                'amount' => $deal['amount'],
                'expected_close_date' => Carbon::now()->addDays(14 + ($index * 7))->toDateString(),
                'closed_date' => $deal['status'] === 'won' ? Carbon::now()->subDays(5)->toDateString() : null,
                'probability' => $deal['probability'],
                'source' => 'Demo import',
                'priority' => $index === 0 ? 'high' : 'medium',
                'status' => $deal['status'],
                'description' => 'Seeded CRM demo opportunity',
                'active' => true,
                'is_system_generated' => true,
                'user_add_id' => $admin?->id,
            ])
        ))->values();

        foreach ($deals as $index => $deal) {
            CrmActivity::query()->updateOrCreate(
                ['deal_id' => $deal->id, 'subject' => 'Follow up on '.$deal->title],
                $this->payload('crm_activities', [
                    'lead_id' => $deal->lead_id,
                    'contact_id' => $deal->contact_id,
                    'assigned_to_id' => $owner?->id,
                    'activity_type' => $index === 2 ? 'email' : 'call',
                    'description' => 'Seeded CRM follow-up activity',
                    'due_at' => Carbon::now()->addDays($index + 1)->setTime(10, 0)->toDateTimeString(),
                    'completed_at' => $index === 2 ? Carbon::now()->subDays(2)->toDateTimeString() : null,
                    'status' => $index === 2 ? 'completed' : 'pending',
                    'priority' => $index === 0 ? 'high' : 'medium',
                    'outcome' => $index === 2 ? 'Client confirmed renewal.' : null,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $admin?->id,
                ])
            );
        }
    }

    private function seedInventory(?Branch $branch, ?User $admin): void
    {
        $warehouse = $this->ensureWarehouse($branch, $admin);
        $products = Product::query()
            ->where('track_inventory', true)
            ->orderBy('code')
            ->limit(5)
            ->get();

        if ($products->isEmpty()) {
            return;
        }

        $adjustment = InventoryAdjustment::query()->updateOrCreate(
            ['adjustment_no' => 'DEMO-INVENTORY-STOCK'],
            $this->payload('inventory_adjustments', [
                'branch_id' => $branch?->id,
                'adjustment_date' => Carbon::now()->toDateString(),
                'warehouse_id' => $warehouse->id,
                'reason' => 'Demo opening balance',
                'notes' => 'Readable stock movement for the Inventory demo.',
                'status' => 'posted',
                'active' => true,
                'approved' => true,
                'approved_at' => Carbon::now()->toDateTimeString(),
                'approved_by_id' => $admin?->id,
                'stock_posted' => true,
                'stock_posted_at' => Carbon::now()->toDateTimeString(),
                'exchange_rate' => 1,
                'total' => 0,
                'is_system_generated' => true,
                'user_add_id' => $admin?->id,
            ])
        );

        InventoryAdjustmentLine::query()
            ->where('inventory_adjustment_id', $adjustment->id)
            ->delete();

        $total = 0;

        foreach ($products as $index => $product) {
            $qty = [24, 16, 12, 48, 32][$index] ?? 20;
            $cost = (float) ($product->purchase_price ?: 0);
            $total += $qty * $cost;

            InventoryAdjustmentLine::query()->create($this->payload('inventory_adjustment_lines', [
                'inventory_adjustment_id' => $adjustment->id,
                'product_id' => $product->id,
                'adjustment_type' => 'increase',
                'qty' => $qty,
                'unit_cost' => $cost,
                'remarks' => 'Seeded module demo stock',
                'active' => true,
            ]));
        }

        $adjustment->forceFill($this->payload('inventory_adjustments', ['total' => $total]))->saveQuietly();
    }

    private function seedProjects(?Branch $branch, array $employees, ?User $admin): void
    {
        $manager = $employees[2] ?? $admin;
        $assignee = $employees[0] ?? $admin;

        $priorities = collect([
            ['name' => 'Low', 'color' => '#64748b'],
            ['name' => 'Medium', 'color' => '#2563eb'],
            ['name' => 'High', 'color' => '#f97316'],
            ['name' => 'Urgent', 'color' => '#dc2626'],
        ])->mapWithKeys(fn (array $priority) => [
            strtolower($priority['name']) => Priority::query()->updateOrCreate(
                ['name' => $priority['name']],
                $this->payload('priorities', [
                    'color' => $priority['color'],
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $admin?->id,
                ])
            ),
        ]);

        $projects = [
            [
                'name' => 'Retail launch workspace',
                'status' => 'IN_PROGRESS',
                'description' => 'Set up inventory, sales workflows, and launch dashboards for a retail customer.',
                'tasks' => [
                    ['name' => 'Confirm product catalog', 'status' => 'In Progress', 'priority' => 'high', 'days' => 3],
                    ['name' => 'Import opening stock', 'status' => 'To Do', 'priority' => 'medium', 'days' => 5],
                    ['name' => 'Train store manager', 'status' => 'Done', 'priority' => 'medium', 'days' => -2],
                ],
            ],
            [
                'name' => 'HR onboarding rollout',
                'status' => 'PENDING',
                'description' => 'Prepare employee onboarding, attendance, and payroll demo processes.',
                'tasks' => [
                    ['name' => 'Review leave policy', 'status' => 'To Do', 'priority' => 'medium', 'days' => 6],
                    ['name' => 'Create onboarding checklist', 'status' => 'In Progress', 'priority' => 'high', 'days' => 4],
                ],
            ],
        ];

        foreach ($projects as $projectIndex => $projectData) {
            $project = Project::query()->updateOrCreate(
                ['name' => $projectData['name']],
                $this->payload('projects', [
                    'branch_id' => $branch?->id,
                    'project_manager_id' => $manager?->id,
                    'start_date' => Carbon::now()->subDays(10 - ($projectIndex * 3))->toDateTimeString(),
                    'end_date' => Carbon::now()->addDays(30 + ($projectIndex * 14))->toDateTimeString(),
                    'description' => $projectData['description'],
                    'status' => $projectData['status'],
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $admin?->id,
                ])
            );

            $team = ProjectTeam::query()->updateOrCreate(
                ['project_id' => $project->id, 'project_team_name' => $project->name.' team'],
                $this->payload('project_teams', [
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $admin?->id,
                ])
            );

            foreach (array_filter([$manager, $assignee]) as $member) {
                ProjectTeamMember::query()->updateOrCreate(
                    ['project_team_id' => $team->id, 'user_id' => $member->id],
                    $this->payload('project_team_members', [
                        'active' => true,
                        'is_system_generated' => true,
                        'user_add_id' => $admin?->id,
                    ])
                );
            }

            $statuses = collect([
                ['name' => 'To Do', 'color' => '#64748b', 'sort_order' => 1],
                ['name' => 'In Progress', 'color' => '#2563eb', 'sort_order' => 2],
                ['name' => 'Done', 'color' => '#16a34a', 'sort_order' => 3],
            ])->mapWithKeys(fn (array $status) => [
                $status['name'] => TaskStatus::query()->updateOrCreate(
                    ['project_id' => $project->id, 'name' => $status['name']],
                    $this->payload('task_statuses', [
                        'color' => $status['color'],
                        'sort_order' => $status['sort_order'],
                        'active' => true,
                        'is_system_generated' => true,
                        'user_add_id' => $admin?->id,
                    ])
                ),
            ]);

            $milestone = Milestone::query()->updateOrCreate(
                ['project_id' => $project->id, 'name' => 'Phase '.($projectIndex + 1).' delivery'],
                $this->payload('milestones', [
                    'start_date' => Carbon::now()->subDays(5)->toDateTimeString(),
                    'end_date' => Carbon::now()->addDays(20)->toDateTimeString(),
                    'description' => 'Seeded project milestone',
                    'status' => $projectIndex === 0 ? 'IN_PROGRESS' : 'PENDING',
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $admin?->id,
                ])
            );

            foreach ($projectData['tasks'] as $taskIndex => $taskData) {
                $task = Task::query()->updateOrCreate(
                    ['project_id' => $project->id, 'name' => $taskData['name']],
                    $this->payload('tasks', [
                        'milestone_id' => $milestone->id,
                        'priority_id' => $priorities[$taskData['priority']]?->id,
                        'task_status_id' => $statuses[$taskData['status']]?->id,
                        'start_date' => Carbon::now()->subDays(2)->toDateTimeString(),
                        'end_date' => Carbon::now()->addDays($taskData['days'])->toDateTimeString(),
                        'completion_time' => $taskData['status'] === 'Done' ? 6 : null,
                        'sort_order' => $taskIndex,
                        'description' => 'Seeded project task for demo planning.',
                        'active' => true,
                        'is_system_generated' => true,
                        'user_add_id' => $admin?->id,
                    ])
                );

                if ($assignee) {
                    AssignedTask::query()->updateOrCreate(
                        ['task_id' => $task->id, 'user_id' => $assignee->id],
                        $this->payload('assigned_tasks', [
                            'active' => true,
                            'is_system_generated' => true,
                            'user_add_id' => $admin?->id,
                        ])
                    );
                }
            }
        }
    }

    private function dealStage(?DealPipeline $pipeline, string $name): ?DealStage
    {
        if (! $pipeline) {
            return null;
        }

        return DealStage::query()
            ->where('deal_pipeline_id', $pipeline->id)
            ->where('name', $name)
            ->first();
    }

    private function ensureWarehouse(?Branch $branch, ?User $admin): Warehouse
    {
        return Warehouse::query()->updateOrCreate(
            ['code' => 'DEMO-MAIN'],
            $this->payload('warehouses', [
                'branch_id' => $branch?->id,
                'name' => 'Demo Main Warehouse',
                'address' => 'Seeded warehouse for Inventory demo',
                'active' => true,
                'is_system_generated' => true,
                'user_add_id' => $admin?->id,
            ])
        );
    }

    private function mainBranch(): ?Branch
    {
        return Branch::query()->where('code', env('SEED_MAIN_BRANCH_CODE', 'MAIN'))->first()
            ?: Branch::query()->where('is_head_office', true)->first()
            ?: Branch::query()->orderBy('name')->first();
    }

    private function payload(string $table, array $payload): array
    {
        if (! Schema::hasTable($table)) {
            return $payload;
        }

        return collect($payload)
            ->filter(fn ($value, string $column): bool => Schema::hasColumn($table, $column))
            ->all();
    }
}
