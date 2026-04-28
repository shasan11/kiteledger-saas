<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Factories\Factory;

class InventoryAdjustmentFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'adjustment_no' => fake()->regexify('[A-Za-z0-9]{40}'),
            'adjustment_date' => fake()->date(),
            'warehouse_id' => Warehouse::factory(),
            'reason' => fake()->regexify('[A-Za-z0-9]{150}'),
            'notes' => fake()->text(),
            'status' => fake()->randomElement(["draft","posted","cancelled"]),
            'active' => fake()->boolean(),
            'approved' => fake()->boolean(),
            'approved_at' => fake()->dateTime(),
            'approved_by_id' => User::factory(),
            'void' => fake()->boolean(),
            'voided_by_id' => User::factory(),
            'voided_reason' => fake()->text(),
            'voided_at' => fake()->dateTime(),
            'exchange_rate' => fake()->randomFloat(6, 0, 999999999999.999999),
            'total' => fake()->randomFloat(6, 0, 999999999999.999999),
            'user_add_id' => User::factory(),
        ];
    }
}
