<?php

namespace Database\Factories;

use App\Models\Variant;
use Illuminate\Database\Eloquent\Factories\Factory;

class VariantLineFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'variant_id' => Variant::factory(),
            'value' => fake()->regexify('[A-Za-z0-9]{80}'),
            'sort_order' => fake()->randomNumber(),
            'active' => fake()->boolean(),
        ];
    }
}
