<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Branch;
use App\Models\Currency;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class BankAccountFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'type' => fake()->randomElement(["bank","cash"]),
            'display_name' => fake()->regexify('[A-Za-z0-9]{150}'),
            'code' => fake()->regexify('[A-Za-z0-9]{30}'),
            'currency_id' => Currency::factory(),
            'description' => fake()->text(),
            'bank_name' => fake()->regexify('[A-Za-z0-9]{150}'),
            'account_name' => fake()->regexify('[A-Za-z0-9]{150}'),
            'account_number' => fake()->regexify('[A-Za-z0-9]{80}'),
            'account_type' => fake()->regexify('[A-Za-z0-9]{50}'),
            'swift_code' => fake()->regexify('[A-Za-z0-9]{50}'),
            'account_id' => Account::factory(),
            'opening_balance' => fake()->randomFloat(2, 0, 99999999999999.99),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
