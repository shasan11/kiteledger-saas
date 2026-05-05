<?php

namespace Database\Seeders;

use App\Models\ContactGroup;
use App\Models\CreditTerm;
use App\Models\Priority;
use Illuminate\Database\Seeder;

class MasterContactDataSeeder extends Seeder
{
    public function run(): void
    {
        $groups = [
            ['name' => 'Customers'],
            ['name' => 'Suppliers'],
            ['name' => 'Employees'],
            ['name' => 'Vendors'],
            ['name' => 'Leads'],
            ['name' => 'Agents'],
            ['name' => 'Walk In Customers'],
        ];

        foreach ($groups as $group) {
            ContactGroup::updateOrCreate(['name' => $group['name']], $group);
        }

        $creditTerms = [
            ['name' => 'Due on Receipt', 'days' => 0],
            ['name' => 'Net 7', 'days' => 7],
            ['name' => 'Net 15', 'days' => 15],
            ['name' => 'Net 30', 'days' => 30],
            ['name' => 'Net 45', 'days' => 45],
            ['name' => 'Net 60', 'days' => 60],
        ];

        foreach ($creditTerms as $term) {
            CreditTerm::updateOrCreate(['name' => $term['name']], $term);
        }

        $priorities = [
            ['name' => 'Low', 'color' => '#52c41a'],
            ['name' => 'Medium', 'color' => '#1677ff'],
            ['name' => 'High', 'color' => '#faad14'],
            ['name' => 'Urgent', 'color' => '#ff4d4f'],
        ];

        foreach ($priorities as $priority) {
            Priority::updateOrCreate(['name' => $priority['name']], $priority);
        }
    }
}
