<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Contact;
use App\Models\CreditTerm;
use App\Models\Currency;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PurchaseOrderFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'purchase_order_no' => fake()->regexify('[A-Za-z0-9]{40}'),
            'purchase_order_date' => fake()->date(),
            'contact_id' => Contact::factory(),
            'currency_id' => Currency::factory(),
            'credit_term_id' => CreditTerm::factory(),
            'exchange_rate' => fake()->randomFloat(6, 0, 9999999999.999999),
            'notes' => fake()->text(),
            'status' => fake()->randomElement(["draft","confirmed","received","cancelled"]),
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
