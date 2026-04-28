<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\CashTransfer;
use Illuminate\Database\Eloquent\Factories\Factory;

class CashTransferLineFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'cash_transfer_id' => CashTransfer::factory(),
            'to_account_id' => Account::factory(),
            'exchange_rate_to_default' => fake()->randomFloat(6, 0, 9999999999.999999),
            'amount' => fake()->randomFloat(2, 0, 99999999999999.99),
            'description' => fake()->text(),
        ];
    }
}
