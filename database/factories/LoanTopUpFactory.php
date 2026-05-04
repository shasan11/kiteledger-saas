<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\LoanAccount;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class LoanTopUpFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'loan_account_id' => LoanAccount::factory(),
            'topup_date' => fake()->date(),
            'loan_received_in_account_id' => Account::factory(),
            'amount' => fake()->randomFloat(6, 0, 999999999999.999999),
            'reference' => fake()->regexify('[A-Za-z0-9]{120}'),
            'notes' => fake()->text(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
