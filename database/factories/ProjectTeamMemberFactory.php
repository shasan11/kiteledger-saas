<?php

namespace Database\Factories;

use App\Models\ProjectTeam;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProjectTeamMemberFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'project_team_id' => ProjectTeam::factory(),
            'user_id' => User::factory(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
