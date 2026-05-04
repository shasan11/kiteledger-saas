<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CustomFieldFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'key' => fake()->regexify('[A-Za-z0-9]{120}'),
            'field_type' => fake()->randomElement(["text","textarea","number","decimal","date","datetime","time","select","multiselect","checkbox","radio","email","phone","url","file","boolean"]),
            'placeholder' => fake()->regexify('[A-Za-z0-9]{180}'),
            'help_text' => fake()->regexify('[A-Za-z0-9]{255}'),
            'default_value' => fake()->regexify('[A-Za-z0-9]{255}'),
            'is_required' => fake()->boolean(),
            'sort_order' => fake()->randomNumber(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
