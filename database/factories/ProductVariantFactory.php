<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductVariantFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'product_id' => Product::factory(),
            'name' => fake()->name(),
            'sku' => fake()->regexify('[A-Za-z0-9]{80}'),
            'product_unit_id' => ProductUnit::factory(),
            'purchase_price' => fake()->randomFloat(2, 0, 99999999999999.99),
            'selling_price' => fake()->randomFloat(2, 0, 99999999999999.99),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
