<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AlertTypeFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'medium' => fake()->randomElement(["email","sms","whatsapp","in_app"]),
            'alert_type' => fake()->regexify('[A-Za-z0-9]{80}'),
            'schedule' => fake()->randomElement(["immediate","daily","weekly","monthly"]),
            'sync_time' => fake()->time(),
            'recipient' => fake()->text(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
