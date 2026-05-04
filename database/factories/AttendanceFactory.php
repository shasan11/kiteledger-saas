<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AttendanceFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'user_id' => User::factory(),
            'in_time' => fake()->dateTime(),
            'out_time' => fake()->dateTime(),
            'ip' => fake()->regexify('[A-Za-z0-9]{60}'),
            'comment' => fake()->regexify('[A-Za-z0-9]{255}'),
            'punch_by' => User::factory(),
            'total_hour' => fake()->randomFloat(2, 0, 999999.99),
            'in_time_status' => fake()->regexify('[A-Za-z0-9]{30}'),
            'out_time_status' => fake()->regexify('[A-Za-z0-9]{30}'),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
