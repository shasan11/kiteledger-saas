<?php

namespace Database\Seeders;

use App\Models\Award;
use App\Models\LeavePolicy;
use App\Models\WeeklyHoliday;
use Illuminate\Database\Seeder;

class MasterHRMAdditionalSeeder extends Seeder
{
    public function run(): void
    {
        LeavePolicy::updateOrCreate(
            ['name' => 'Standard Leave Policy'],
            [
                'paid_leave_count' => 12,
                'unpaid_leave_count' => 0,
                'description' => 'Standard leave policy with 12 paid days per year',
            ]
        );

        WeeklyHoliday::updateOrCreate(
            ['name' => 'Saturday Weekly Holiday'],
            [
                'start_day' => 'Saturday',
                'end_day' => 'Saturday',
                'active' => true,
                'is_system_generated' => true,
            ]
        );

        Award::updateOrCreate(
            ['name' => 'Employee of the Month'],
            ['description' => 'Award for best performing employee']
        );

        Award::updateOrCreate(
            ['name' => 'Best Performer'],
            ['description' => 'Award for best performer']
        );
    }
}
