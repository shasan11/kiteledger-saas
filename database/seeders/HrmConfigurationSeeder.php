<?php

namespace Database\Seeders;

use App\Models\HrmConfiguration;
use Illuminate\Database\Seeder;

class HrmConfigurationSeeder extends Seeder
{
    public function run(): void
    {
        HrmConfiguration::query()->firstOrCreate(
            ['active' => true],
            [
                'default_working_hours_per_day' => 8,
                'default_working_days_per_week' => 6,
                'attendance_grace_period_minutes' => 10,
                'half_day_threshold_hours' => 4,
                'overtime_enabled' => false,
                'overtime_rate_multiplier' => 1.5,
                'attendance_correction_enabled' => true,
                'leave_year_start_month' => 4,
                'payroll_day' => 30,
                'probation_period_days' => 90,
                'weekend_days' => ['SATURDAY'],
                'require_leave_approval' => true,
                'require_attendance_approval' => false,
                'is_system_generated' => true,
                'user_add_id' => null,
            ]
        );
    }
}
