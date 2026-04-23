<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CreditTermFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'name' => fake()->name(),
            'days' => fake()->randomNumber(),
            'description' => fake()->text(),
            'active' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
