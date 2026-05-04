<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class EmailFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'sender_email' => fake()->regexify('[A-Za-z0-9]{150}'),
            'receiver_email' => fake()->regexify('[A-Za-z0-9]{150}'),
            'subject' => fake()->regexify('[A-Za-z0-9]{255}'),
            'body' => fake()->text(),
            'email_status' => fake()->regexify('[A-Za-z0-9]{30}'),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
