<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class MilestoneFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'name' => fake()->name(),
            'start_date' => fake()->dateTime(),
            'end_date' => fake()->dateTime(),
            'description' => fake()->text(),
            'status' => fake()->randomElement(["PENDING","IN_PROGRESS","COMPLETED","CANCELLED"]),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
