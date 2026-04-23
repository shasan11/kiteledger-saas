<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Contact;
use App\Models\Currency;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Factories\Factory;

class InvoiceFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'invoice_no' => fake()->regexify('[A-Za-z0-9]{40}'),
            'invoice_date' => fake()->date(),
            'due_date' => fake()->date(),
            'contact_id' => Contact::factory(),
            'warehouse_id' => Warehouse::factory(),
            'currency_id' => Currency::factory(),
            'exchange_rate' => fake()->randomFloat(6, 0, 9999999999.999999),
            'reference' => fake()->regexify('[A-Za-z0-9]{120}'),
            'notes' => fake()->text(),
            'paid_total' => fake()->randomFloat(2, 0, 99999999999999.99),
            'balance_due' => fake()->randomFloat(2, 0, 99999999999999.99),
            'export_country' => fake()->regexify('[A-Za-z0-9]{80}'),
            'export_date' => fake()->date(),
            'export_document_number' => fake()->regexify('[A-Za-z0-9]{80}'),
            'status' => fake()->randomElement(["draft","posted","part_paid","paid","void"]),
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
