<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CustomTemplateFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'purpose' => fake()->regexify('[A-Za-z0-9]{80}'),
            'content' => fake()->paragraphs(3, true),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
