<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CurrencyFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'code' => fake()->regexify('[A-Za-z0-9]{10}'),
            'name' => fake()->name(),
            'symbol' => fake()->regexify('[A-Za-z0-9]{20}'),
            'decimal_places' => fake()->randomDigitNotNull(),
            'is_base' => fake()->boolean(),
            'active' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
