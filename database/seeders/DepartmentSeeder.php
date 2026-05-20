<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            [
                'name'        => 'Executive',
                'description' => 'Top-level executive management and strategic leadership.',
            ],
            [
                'name'        => 'Operations',
                'description' => 'Day-to-day operational management and coordination.',
            ],
            [
                'name'        => 'Finance',
                'description' => 'Accounting, budgeting, payroll, and financial reporting.',
            ],
            [
                'name'        => 'Human Resources',
                'description' => 'Recruitment, onboarding, employee relations, and HR compliance.',
            ],
            [
                'name'        => 'Sales',
                'description' => 'Sales, business development, and customer acquisition.',
            ],
            [
                'name'        => 'Warehouse',
                'description' => 'Inventory management, receiving, and warehouse operations.',
            ],
            [
                'name'        => 'Support',
                'description' => 'Customer support, after-sales service, and help desk.',
            ],
        ];

        foreach ($departments as $data) {
            Department::query()->updateOrCreate(
                ['name' => $data['name']],
                [
                    'description'        => $data['description'],
                    'active'             => true,
                    'is_system_generated' => true,
                ]
            );
        }
    }
}
