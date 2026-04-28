<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Contact;
use App\Models\Currency;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProformaInvoiceFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'proforma_no' => fake()->regexify('[A-Za-z0-9]{40}'),
            'reference' => fake()->regexify('[A-Za-z0-9]{120}'),
            'proforma_date' => fake()->date(),
            'contact_id' => Contact::factory(),
            'currency_id' => Currency::factory(),
            'notes' => fake()->text(),
            'status' => fake()->randomElement(["draft","issued","cancelled"]),
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
