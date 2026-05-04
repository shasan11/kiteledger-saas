<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class LoanAccountFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'bank_name' => fake()->regexify('[A-Za-z0-9]{150}'),
            'loan_number' => fake()->regexify('[A-Za-z0-9]{80}'),
            'description' => fake()->text(),
            'opening_balance' => fake()->randomFloat(6, 0, 999999999999.999999),
            'current_balance' => fake()->randomFloat(6, 0, 999999999999.999999),
            'balance_as_of' => fake()->date(),
            'loan_received_in_account_id' => Account::factory(),
            'related_account_id' => Account::factory(),
            'interest_rate_per_annum' => fake()->randomFloat(4, 0, 9999.9999),
            'duration_in_month' => fake()->randomNumber(),
            'processing_fee' => fake()->randomFloat(6, 0, 999999999999.999999),
            'processing_fee_paid_from_account_id' => Account::factory(),
            'status' => fake()->randomElement(["active","closed","settled","cancelled"]),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
