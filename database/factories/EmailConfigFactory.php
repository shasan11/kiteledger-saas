<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class EmailConfigFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'email_config_name' => fake()->regexify('[A-Za-z0-9]{120}'),
            'email_host' => fake()->regexify('[A-Za-z0-9]{150}'),
            'email_port' => fake()->regexify('[A-Za-z0-9]{20}'),
            'email_user' => fake()->regexify('[A-Za-z0-9]{150}'),
            'email_pass' => fake()->regexify('[A-Za-z0-9]{255}'),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
