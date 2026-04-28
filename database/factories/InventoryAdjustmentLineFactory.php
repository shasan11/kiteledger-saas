<?php

namespace Database\Factories;

use App\Models\InventoryAdjustment;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

class InventoryAdjustmentLineFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'inventory_adjustment_id' => InventoryAdjustment::factory(),
            'product_variant_id' => ProductVariant::factory(),
            'adjustment_type' => fake()->randomElement(["increase","decrease"]),
            'qty' => fake()->randomFloat(4, 0, 999999999999.9999),
            'unit_cost' => fake()->randomFloat(2, 0, 99999999999999.99),
            'remarks' => fake()->regexify('[A-Za-z0-9]{200}'),
            'active' => fake()->boolean(),
        ];
    }
}
