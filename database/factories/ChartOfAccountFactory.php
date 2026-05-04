<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ChartOfAccountFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'branch_id' => Branch::factory(),
            'type' => fake()->randomElement(["asset","liability","equity","income","expense"]),
            'code' => fake()->regexify('[A-Za-z0-9]{30}'),
            'name' => fake()->name(),
            'parent_id' => ChartOfAccount::factory(),
            'description' => fake()->text(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
