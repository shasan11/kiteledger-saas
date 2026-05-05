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
            ['name' => 'Full Time', 'colour_value' => '#52c41a'],
            ['name' => 'Part Time', 'colour_value' => '#1677ff'],
            ['name' => 'Contract', 'colour_value' => '#722ed1'],
            ['name' => 'Probation', 'colour_value' => '#faad14'],
            ['name' => 'Intern', 'colour_value' => '#13c2c2'],
            ['name' => 'Resigned', 'colour_value' => '#8c8c8c'],
            ['name' => 'Terminated', 'colour_value' => '#ff4d4f'],
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
