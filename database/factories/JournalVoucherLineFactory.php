<?php

namespace Database\Factories;

use App\Models\ChartOfAccount;
use App\Models\JournalVoucher;
use Illuminate\Database\Eloquent\Factories\Factory;

class JournalVoucherLineFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'journal_voucher_id' => JournalVoucher::factory(),
            'chart_of_account_id' => ChartOfAccount::factory(),
            'description' => fake()->text(),
            'debit' => fake()->randomFloat(2, 0, 99999999999999.99),
            'credit' => fake()->randomFloat(2, 0, 99999999999999.99),
        ];
    }
}
