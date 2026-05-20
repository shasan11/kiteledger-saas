<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Designation;
use Illuminate\Database\Seeder;

class DesignationSeeder extends Seeder
{
    public function run(): void
    {
        // Ensure departments exist first (DepartmentSeeder may have been run already)
        $this->call(DepartmentSeeder::class);

        $departments = Department::query()
            ->pluck('id', 'name')
            ->toArray();

        $designations = [
            [
                'name'               => 'Chief Executive Officer',
                'code'               => 'CEO',
                'department'         => 'Executive',
                'level'              => 'C-Level',
                'grade'              => 'G1',
                'sort_order'         => 10,
                'default_basic_salary' => 150000.00,
                'salary_frequency'   => 'monthly',
                'overtime_eligible'  => false,
                'taxable'            => true,
                'description'        => 'Chief executive responsible for overall organizational strategy and performance.',
            ],
            [
                'name'               => 'Managing Director',
                'code'               => 'MD',
                'department'         => 'Executive',
                'level'              => 'C-Level',
                'grade'              => 'G1',
                'sort_order'         => 20,
                'default_basic_salary' => 120000.00,
                'salary_frequency'   => 'monthly',
                'overtime_eligible'  => false,
                'taxable'            => true,
                'description'        => 'Manages overall business direction and major operational decisions.',
            ],
            [
                'name'               => 'Operations Manager',
                'code'               => 'OPS-MGR',
                'department'         => 'Operations',
                'level'              => 'Manager',
                'grade'              => 'G3',
                'sort_order'         => 30,
                'default_basic_salary' => 80000.00,
                'salary_frequency'   => 'monthly',
                'overtime_eligible'  => false,
                'taxable'            => true,
                'description'        => 'Oversees daily operational activities and process efficiency.',
            ],
            [
                'name'               => 'HR Manager',
                'code'               => 'HR-MGR',
                'department'         => 'Human Resources',
                'level'              => 'Manager',
                'grade'              => 'G3',
                'sort_order'         => 40,
                'default_basic_salary' => 65000.00,
                'salary_frequency'   => 'monthly',
                'overtime_eligible'  => false,
                'taxable'            => true,
                'description'        => 'Manages HR functions including recruitment, payroll, and employee relations.',
            ],
            [
                'name'               => 'Accountant',
                'code'               => 'ACCT',
                'department'         => 'Finance',
                'level'              => 'Staff',
                'grade'              => 'G4',
                'sort_order'         => 50,
                'default_basic_salary' => 50000.00,
                'salary_frequency'   => 'monthly',
                'overtime_eligible'  => true,
                'taxable'            => true,
                'description'        => 'Handles accounting, bookkeeping, and financial reporting.',
            ],
            [
                'name'               => 'Sales Executive',
                'code'               => 'SALES-EXE',
                'department'         => 'Sales',
                'level'              => 'Junior',
                'grade'              => 'G5',
                'sort_order'         => 60,
                'default_basic_salary' => 35000.00,
                'salary_frequency'   => 'monthly',
                'overtime_eligible'  => true,
                'taxable'            => true,
                'description'        => 'Front-line sales representative responsible for customer acquisition and retention.',
            ],
            [
                'name'               => 'Cashier',
                'code'               => 'CASH',
                'department'         => 'Operations',
                'level'              => 'Junior',
                'grade'              => 'G6',
                'sort_order'         => 70,
                'default_basic_salary' => 30000.00,
                'salary_frequency'   => 'monthly',
                'overtime_eligible'  => true,
                'taxable'            => false,
                'description'        => 'Handles cash transactions and POS operations at the counter.',
            ],
            [
                'name'               => 'Warehouse Staff',
                'code'               => 'WH-STAFF',
                'department'         => 'Warehouse',
                'level'              => 'Junior',
                'grade'              => 'G6',
                'sort_order'         => 80,
                'default_basic_salary' => 28000.00,
                'salary_frequency'   => 'monthly',
                'overtime_eligible'  => true,
                'taxable'            => false,
                'description'        => 'Manages inventory, receiving, and warehouse organisation.',
            ],
            [
                'name'               => 'Support Staff',
                'code'               => 'SUPP-STAFF',
                'department'         => 'Support',
                'level'              => 'Junior',
                'grade'              => 'G7',
                'sort_order'         => 90,
                'default_basic_salary' => 25000.00,
                'salary_frequency'   => 'monthly',
                'overtime_eligible'  => true,
                'taxable'            => false,
                'description'        => 'Provides customer support, help-desk assistance, and after-sales service.',
            ],
        ];

        foreach ($designations as $data) {
            $departmentId = $departments[$data['department']] ?? null;

            Designation::query()->updateOrCreate(
                ['name' => $data['name']],
                [
                    'department_id'        => $departmentId,
                    'name'                 => $data['name'],
                    'level'                => $data['level'],
                    'grade'                => $data['grade'],
                    'sort_order'           => $data['sort_order'],
                    'default_basic_salary' => $data['default_basic_salary'],
                    'salary_frequency'     => $data['salary_frequency'],
                    'overtime_eligible'    => $data['overtime_eligible'],
                    'taxable'              => $data['taxable'],
                    'description'          => $data['description'],
                    'active'               => true,
                    'is_system_generated'  => true,
                ]
            );
        }
    }
}
