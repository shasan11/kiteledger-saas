<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class EducationFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'degree' => fake()->regexify('[A-Za-z0-9]{120}'),
            'institution' => fake()->regexify('[A-Za-z0-9]{180}'),
            'field_of_study' => fake()->regexify('[A-Za-z0-9]{120}'),
            'result' => fake()->regexify('[A-Za-z0-9]{60}'),
            'study_start_date' => fake()->dateTime(),
            'study_end_date' => fake()->dateTime(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
