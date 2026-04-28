<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Contact;
use App\Models\Currency;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Factories\Factory;

class PurchaseBillFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'bill_no' => fake()->regexify('[A-Za-z0-9]{40}'),
            'bill_date' => fake()->date(),
            'due_date' => fake()->date(),
            'contact_id' => Contact::factory(),
            'warehouse_id' => Warehouse::factory(),
            'currency_id' => Currency::factory(),
            'reference' => fake()->regexify('[A-Za-z0-9]{120}'),
            'notes' => fake()->text(),
            'import_country' => fake()->regexify('[A-Za-z0-9]{80}'),
            'import_date' => fake()->date(),
            'import_document_number' => fake()->regexify('[A-Za-z0-9]{80}'),
            'paid_total' => fake()->randomFloat(2, 0, 99999999999999.99),
            'balance_due' => fake()->randomFloat(2, 0, 99999999999999.99),
            'status' => fake()->randomElement(["draft","posted","part_paid","paid","void"]),
            'active' => fake()->boolean(),
            'approved' => fake()->boolean(),
            'approved_at' => fake()->dateTime(),
            'approved_by_id' => User::factory(),
            'void' => fake()->boolean(),
            'voided_by_id' => User::factory(),
            'voided_reason' => fake()->text(),
            'voided_at' => fake()->dateTime(),
            'exchange_rate' => fake()->randomFloat(6, 0, 999999999999.999999),
            'total' => fake()->randomFloat(6, 0, 999999999999.999999),
            'user_add_id' => User::factory(),
        ];
    }
}
