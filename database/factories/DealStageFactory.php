<?php

namespace Database\Factories;

use App\Models\DealPipeline;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class DealStageFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'deal_pipeline_id' => DealPipeline::factory(),
            'name' => fake()->name(),
            'color' => fake()->regexify('[A-Za-z0-9]{20}'),
            'probability' => fake()->randomDigitNotNull(),
            'sort_order' => fake()->randomNumber(),
            'is_won_stage' => fake()->boolean(),
            'is_lost_stage' => fake()->boolean(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
