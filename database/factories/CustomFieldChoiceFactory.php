<?php

namespace Database\Factories;

use App\Models\CustomField;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CustomFieldChoiceFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'custom_field_id' => CustomField::factory(),
            'label' => fake()->regexify('[A-Za-z0-9]{120}'),
            'value' => fake()->regexify('[A-Za-z0-9]{120}'),
            'color' => fake()->regexify('[A-Za-z0-9]{20}'),
            'sort_order' => fake()->randomNumber(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
