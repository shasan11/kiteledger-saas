<?php

namespace Database\Factories;

use App\Models\ProductVariant;
use App\Models\VariantLine;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductVariantItemFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'product_variant_id' => ProductVariant::factory(),
            'variant_line_id' => VariantLine::factory(),
        ];
    }
}
