<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class LeaveApplicationFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'user_id' => User::factory(),
            'leave_type' => fake()->regexify('[A-Za-z0-9]{60}'),
            'leave_from' => fake()->dateTime(),
            'leave_to' => fake()->dateTime(),
            'accept_leave_from' => fake()->dateTime(),
            'accept_leave_to' => fake()->dateTime(),
            'accept_leave_by' => User::factory(),
            'leave_duration' => fake()->numberBetween(-10000, 10000),
            'reason' => fake()->regexify('[A-Za-z0-9]{255}'),
            'review_comment' => fake()->regexify('[A-Za-z0-9]{255}'),
            'attachment' => fake()->regexify('[A-Za-z0-9]{255}'),
            'status' => fake()->randomElement(["PENDING","APPROVED","REJECTED","CANCELLED"]),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
