<?php

namespace Database\Factories;

use App\Models\CustomField;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CustomFieldValidationFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'custom_field_id' => CustomField::factory(),
            'rule' => fake()->randomElement(["min","max","min_length","max_length","regex","email","url","numeric","integer","decimal","date","before","after","in","not_in"]),
            'value' => fake()->regexify('[A-Za-z0-9]{255}'),
            'message' => fake()->regexify('[A-Za-z0-9]{255}'),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
