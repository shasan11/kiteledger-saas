<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\PurchaseBill;
use App\Models\TaxJurisdiction;
use App\Models\TaxRate;
use Illuminate\Database\Eloquent\Factories\Factory;

class PurchaseBillLineFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'purchase_bill_id' => PurchaseBill::factory(),
            'product_id' => Product::factory(),
            'custom_product_name' => fake()->regexify('[A-Za-z0-9]{180}'),
            'description' => fake()->text(),
            'qty' => fake()->randomFloat(4, 0, 999999999999.9999),
            'unit_price' => fake()->randomFloat(2, 0, 99999999999999.99),
            'discount_percent' => fake()->randomFloat(4, 0, 9999.9999),
            'tax_rate_id' => TaxRate::factory(),
            'tax_jurisdiction_id' => TaxJurisdiction::factory(),
            'tax_amount' => fake()->randomFloat(2, 0, 99999999999999.99),
            'tax_breakup' => '{}',
            'line_total' => fake()->randomFloat(2, 0, 99999999999999.99),
        ];
    }
}
