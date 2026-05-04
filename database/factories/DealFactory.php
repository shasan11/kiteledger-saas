<?php

namespace Database\Factories;

use App\Models\Contact;
use App\Models\DealPipeline;
use App\Models\DealStage;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class DealFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'deal_no' => fake()->regexify('[A-Za-z0-9]{40}'),
            'lead_id' => Lead::factory(),
            'contact_id' => Contact::factory(),
            'deal_pipeline_id' => DealPipeline::factory(),
            'deal_stage_id' => DealStage::factory(),
            'assigned_to_id' => User::factory(),
            'title' => fake()->sentence(4),
            'amount' => fake()->randomFloat(2, 0, 99999999999999.99),
            'expected_close_date' => fake()->date(),
            'closed_date' => fake()->date(),
            'probability' => fake()->randomDigitNotNull(),
            'source' => fake()->regexify('[A-Za-z0-9]{80}'),
            'priority' => fake()->randomElement(["low","medium","high","urgent"]),
            'status' => fake()->randomElement(["open","won","lost","cancelled"]),
            'lost_reason' => fake()->regexify('[A-Za-z0-9]{255}'),
            'description' => fake()->text(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
