<?php

namespace Database\Seeders;

use App\Models\EmploymentStatus;
use App\Models\Department;
use App\Models\Designation;
use Illuminate\Database\Seeder;

class MasterHRMDataSeeder extends Seeder
{
    public function run(): void
    {
        $statuses = [
            ['name' => 'Full Time'],
            ['name' => 'Part Time'],
            ['name' => 'Contract'],
            ['name' => 'Probation'],
            ['name' => 'Intern'],
            ['name' => 'Resigned'],
            ['name' => 'Terminated'],
        ];

        foreach ($statuses as $status) {
            EmploymentStatus::updateOrCreate(['name' => $status['name']], $status);
        }

        $departments = [
            ['name' => 'Management'],
            ['name' => 'Finance'],
            ['name' => 'Sales'],
            ['name' => 'Purchase'],
            ['name' => 'Warehouse'],
            ['name' => 'HR'],
            ['name' => 'IT'],
            ['name' => 'Operations'],
        ];

        foreach ($departments as $department) {
            Department::updateOrCreate(['name' => $department['name']], $department);
        }

        $designations = [
            ['name' => 'CEO'],
            ['name' => 'Manager'],
            ['name' => 'Accountant'],
            ['name' => 'Sales Executive'],
            ['name' => 'Purchase Officer'],
            ['name' => 'Warehouse Officer'],
            ['name' => 'HR Officer'],
            ['name' => 'Developer'],
            ['name' => 'Support Executive'],
        ];

        foreach ($designations as $designation) {
            Designation::updateOrCreate(['name' => $designation['name']], $designation);
        }
    }
}
