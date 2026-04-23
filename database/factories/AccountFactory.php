<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AccountFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'name' => fake()->name(),
            'code' => fake()->regexify('[A-Za-z0-9]{30}'),
            'nature' => fake()->randomElement(["asset","liability","equity","income","expense"]),
            'parent_id' => Account::factory(),
            'is_system_generated' => fake()->boolean(),
            'active' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
