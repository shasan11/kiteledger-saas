<?php

namespace Database\Factories;

use App\Models\ProductVariant;
use App\Models\SalesOrder;
use App\Models\TaxRate;
use Illuminate\Database\Eloquent\Factories\Factory;

class SalesOrderLineFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'sales_order_id' => SalesOrder::factory(),
            'product_variant_id' => ProductVariant::factory(),
            'custom_product_name' => fake()->regexify('[A-Za-z0-9]{180}'),
            'description' => fake()->text(),
            'qty' => fake()->randomFloat(4, 0, 999999999999.9999),
            'unit_price' => fake()->randomFloat(2, 0, 99999999999999.99),
            'discount_percent' => fake()->randomFloat(4, 0, 9999.9999),
            'tax_rate_id' => TaxRate::factory(),
            'tax_amount' => fake()->randomFloat(2, 0, 99999999999999.99),
            'line_total' => fake()->randomFloat(2, 0, 99999999999999.99),
        ];
    }
}
