<?php

namespace Database\Factories;

use App\Models\ContactGroup;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ContactGroupFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'parent_id' => ContactGroup::factory(),
            'description' => fake()->text(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
