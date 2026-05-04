<?php

namespace Database\Factories;

use App\Models\CrmActivity;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CrmActivityCommentFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'crm_activity_id' => CrmActivity::factory(),
            'user_id' => User::factory(),
            'comment' => fake()->text(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
