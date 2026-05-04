<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\LoanAccount;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class LoanChargeFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'loan_account_id' => LoanAccount::factory(),
            'charge_name' => fake()->regexify('[A-Za-z0-9]{150}'),
            'charge_date' => fake()->date(),
            'amount' => fake()->randomFloat(6, 0, 999999999999.999999),
            'charges_paid_from_account_id' => Account::factory(),
            'reference' => fake()->regexify('[A-Za-z0-9]{120}'),
            'notes' => fake()->text(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
