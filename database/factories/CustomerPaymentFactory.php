<?php

namespace Database\Factories;

use App\Models\BankAccount;
use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\Currency;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CustomerPaymentFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'payment_no' => fake()->regexify('[A-Za-z0-9]{40}'),
            'payment_date' => fake()->date(),
            'contact_id' => Contact::factory(),
            'bank_account_id' => BankAccount::factory(),
            'currency_id' => Currency::factory(),
            'exchange_rate' => fake()->randomFloat(6, 0, 9999999999.999999),
            'amount' => fake()->randomFloat(2, 0, 99999999999999.99),
            'payment_method' => fake()->regexify('[A-Za-z0-9]{20}'),
            'bank_charges_account_id' => ChartOfAccount::factory(),
            'bank_charges' => fake()->randomFloat(2, 0, 99999999999999.99),
            'tds_charges_account_id' => ChartOfAccount::factory(),
            'tds_type' => fake()->regexify('[A-Za-z0-9]{20}'),
            'tds_charges' => fake()->randomFloat(2, 0, 99999999999999.99),
            'reference' => fake()->regexify('[A-Za-z0-9]{120}'),
            'notes' => fake()->text(),
            'status' => fake()->randomElement(["draft","posted","cancelled"]),
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
