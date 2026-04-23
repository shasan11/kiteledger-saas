<?php

namespace Database\Factories;

use App\Models\ChartOfAccount;
use App\Models\Expense;
use App\Models\TaxRate;
use Illuminate\Database\Eloquent\Factories\Factory;

class ExpenseLineFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'expense_id' => Expense::factory(),
            'chart_of_account_id' => ChartOfAccount::factory(),
            'description' => fake()->text(),
            'tax_rate_id' => TaxRate::factory(),
            'amount' => fake()->randomFloat(2, 0, 99999999999999.99),
            'tax_amount' => fake()->randomFloat(2, 0, 99999999999999.99),
            'line_total' => fake()->randomFloat(2, 0, 99999999999999.99),
        ];
    }
}
