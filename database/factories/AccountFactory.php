<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Currency;
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
            'name' => fake()->name(),
            'code' => fake()->regexify('[A-Za-z0-9]{30}'),
            'nature' => fake()->randomElement(["actor","coa","bank","cash","employee"]),
            'parent_id' => Account::factory(),
            'currency_id' => Currency::factory(),
            'swift_code' => fake()->regexify('[A-Za-z0-9]{50}'),
            'dr_amount' => fake()->randomFloat(2, 0, 99999999999999.99),
            'cr_amount' => fake()->randomFloat(2, 0, 99999999999999.99),
            'balance' => fake()->randomFloat(2, 0, 99999999999999.99),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
