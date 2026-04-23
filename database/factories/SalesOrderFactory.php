<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Contact;
use App\Models\Currency;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Factories\Factory;

class SalesOrderFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'sales_order_no' => fake()->regexify('[A-Za-z0-9]{40}'),
            'sales_order_date' => fake()->date(),
            'contact_id' => Contact::factory(),
            'warehouse_id' => Warehouse::factory(),
            'currency_id' => Currency::factory(),
            'exchange_rate' => fake()->randomFloat(6, 0, 9999999999.999999),
            'reference' => fake()->regexify('[A-Za-z0-9]{120}'),
            'notes' => fake()->text(),
            'subtotal' => fake()->randomFloat(2, 0, 99999999999999.99),
            'discount_total' => fake()->randomFloat(2, 0, 99999999999999.99),
            'tax_total' => fake()->randomFloat(2, 0, 99999999999999.99),
            'grand_total' => fake()->randomFloat(2, 0, 99999999999999.99),
            'status' => fake()->randomElement(["draft","confirmed","fulfilled","cancelled"]),
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
