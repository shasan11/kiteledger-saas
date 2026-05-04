<?php

namespace Database\Factories;

use App\Models\Milestone;
use App\Models\Priority;
use App\Models\Project;
use App\Models\TaskStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaskFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'milestone_id' => Milestone::factory(),
            'priority_id' => Priority::factory(),
            'task_status_id' => TaskStatus::factory(),
            'name' => fake()->name(),
            'start_date' => fake()->dateTime(),
            'end_date' => fake()->dateTime(),
            'completion_time' => fake()->randomFloat(2, 0, 999999.99),
            'description' => fake()->text(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
