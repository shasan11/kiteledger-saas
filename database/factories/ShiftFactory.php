<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ShiftFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'start_time' => fake()->time(),
            'end_time' => fake()->time(),
            'work_hour' => fake()->randomFloat(2, 0, 999999.99),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
