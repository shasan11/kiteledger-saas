<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class BranchFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'code' => fake()->regexify('[A-Za-z0-9]{30}'),
            'name' => fake()->name(),
            'phone' => fake()->phoneNumber(),
            'email' => fake()->safeEmail(),
            'address' => fake()->text(),
            'is_head_office' => fake()->boolean(),
            'is_transaction_enabled' => fake()->boolean(),
            'is_pos_enabled' => fake()->boolean(),
            'is_warehouse_enabled' => fake()->boolean(),
            'is_ai_enabled' => fake()->boolean(),
            'is_billing_location_enabled' => fake()->boolean(),
            'abbreviated_tax_enabled' => fake()->boolean(),
            'track_location' => fake()->boolean(),
            'logo' => fake()->regexify('[A-Za-z0-9]{255}'),
            'favicon' => fake()->regexify('[A-Za-z0-9]{255}'),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
