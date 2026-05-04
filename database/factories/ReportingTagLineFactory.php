<?php

namespace Database\Factories;

use App\Models\ReportingTag;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReportingTagLineFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'reporting_tag_id' => ReportingTag::factory(),
            'name' => fake()->name(),
            'color' => fake()->regexify('[A-Za-z0-9]{20}'),
            'sort_order' => fake()->randomNumber(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
