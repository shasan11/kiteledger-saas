<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\TaxClass;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaxRateFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'tax_class_id' => TaxClass::factory(),
            'name' => fake()->name(),
            'rate_percent' => fake()->randomFloat(4, 0, 9999.9999),
            'inclusive' => fake()->boolean(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
