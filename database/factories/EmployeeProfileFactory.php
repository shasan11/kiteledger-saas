<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\EmploymentStatus;
use App\Models\LeavePolicy;
use App\Models\Shift;
use App\Models\User;
use App\Models\WeeklyHoliday;
use Illuminate\Database\Eloquent\Factories\Factory;

class EmployeeProfileFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'branch_id' => Branch::factory(),
            'employment_status_id' => EmploymentStatus::factory(),
            'department_id' => Department::factory(),
            'designation_id' => Designation::factory(),
            'shift_id' => Shift::factory(),
            'leave_policy_id' => LeavePolicy::factory(),
            'weekly_holiday_id' => WeeklyHoliday::factory(),
            'employee_id' => fake()->regexify('[A-Za-z0-9]{60}'),
            'join_date' => fake()->dateTime(),
            'leave_date' => fake()->dateTime(),
            'salary' => fake()->randomFloat(2, 0, 99999999999999.99),
            'blood_group' => fake()->regexify('[A-Za-z0-9]{10}'),
            'emergency_contact_name' => fake()->regexify('[A-Za-z0-9]{120}'),
            'emergency_contact_phone' => fake()->regexify('[A-Za-z0-9]{40}'),
            'address' => fake()->text(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
