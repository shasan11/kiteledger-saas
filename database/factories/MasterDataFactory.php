<?php

namespace Database\Factories;

use App\Models\Branch;
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
            'branch_id' => Branch::factory(),
            'group' => fake()->regexify('[A-Za-z0-9]{80}'),
            'key' => fake()->regexify('[A-Za-z0-9]{120}'),
            'value' => fake()->regexify('[A-Za-z0-9]{180}'),
            'meta' => '{}',
            'active' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
