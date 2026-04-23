<?php

namespace Database\Factories;

use App\Models\BankAccount;
use App\Models\Branch;
use App\Models\Currency;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CashTransferFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'transfer_no' => fake()->regexify('[A-Za-z0-9]{40}'),
            'transfer_date' => fake()->date(),
            'from_bank_account_id' => BankAccount::factory(),
            'reference' => fake()->regexify('[A-Za-z0-9]{120}'),
            'currency_id' => Currency::factory(),
            'total_amount' => fake()->randomFloat(2, 0, 99999999999999.99),
            'notes' => fake()->text(),
            'status' => fake()->randomElement(["draft","posted","cancelled"]),
            'user_add_id' => User::factory(),
            'active' => fake()->boolean(),
            'approved' => fake()->boolean(),
            'exchange_rate' => fake()->randomFloat(6, 0, 9999999999.999999),
            'voided' => fake()->boolean(),
            'voided_reason' => fake()->text(),
            'voided_date' => fake()->date(),
            'voided_by_id' => User::factory(),
        ];
    }
}
