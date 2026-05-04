<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class MasterDataFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'type' => fake()->randomElement(["custom_status","lead_source","deal_stage","task_type","credit_term","cost_term","payment_mode","tds_type","industry","activity_type","lost_reason"]),
            'group' => fake()->regexify('[A-Za-z0-9]{80}'),
            'key' => fake()->regexify('[A-Za-z0-9]{120}'),
            'value' => fake()->regexify('[A-Za-z0-9]{180}'),
            'meta' => '{}',
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
