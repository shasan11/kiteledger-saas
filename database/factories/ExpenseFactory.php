<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\Currency;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ExpenseFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'expense_no' => fake()->regexify('[A-Za-z0-9]{40}'),
            'reference' => fake()->regexify('[A-Za-z0-9]{120}'),
            'expense_date' => fake()->date(),
            'due_date' => fake()->date(),
            'contact_id' => Contact::factory(),
            'currency_id' => Currency::factory(),
            'exchange_rate' => fake()->randomFloat(6, 0, 9999999999.999999),
            'notes' => fake()->text(),
            'total' => fake()->randomFloat(2, 0, 99999999999999.99),
            'status' => fake()->randomElement(["draft","posted","cancelled"]),
            'tds_charges_account_id' => ChartOfAccount::factory(),
            'tds_type' => fake()->regexify('[A-Za-z0-9]{20}'),
            'tds_charges' => fake()->randomFloat(2, 0, 99999999999999.99),
            'user_add_id' => User::factory(),
            'active' => fake()->boolean(),
            'approved' => fake()->boolean(),
            'voided' => fake()->boolean(),
            'voided_reason' => fake()->text(),
            'voided_date' => fake()->date(),
            'voided_by_id' => User::factory(),
        ];
    }
}
