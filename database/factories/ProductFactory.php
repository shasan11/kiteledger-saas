<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\ProductCategory;
use App\Models\ProductUnit;
use App\Models\TaxClass;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'product_category_id' => ProductCategory::factory(),
            'name' => fake()->name(),
            'code' => fake()->regexify('[A-Za-z0-9]{60}'),
            'barcode' => fake()->regexify('[A-Za-z0-9]{80}'),
            'description' => fake()->text(),
            'product_unit_id' => ProductUnit::factory(),
            'tax_class_id' => TaxClass::factory(),
            'track_inventory' => fake()->boolean(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
