<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Currency;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class JournalVoucherFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'voucher_no' => fake()->regexify('[A-Za-z0-9]{40}'),
            'voucher_date' => fake()->date(),
            'currency_id' => Currency::factory(),
            'exchange_rate' => fake()->randomFloat(6, 0, 9999999999.999999),
            'reference' => fake()->regexify('[A-Za-z0-9]{120}'),
            'narration' => fake()->text(),
            'status' => fake()->randomElement(["draft","posted","cancelled"]),
            'user_add_id' => User::factory(),
            'active' => fake()->boolean(),
            'approved' => fake()->boolean(),
            'voided' => fake()->boolean(),
            'voided_reason' => fake()->text(),
            'voided_date' => fake()->date(),
            'voided_by_id' => User::factory(),
        ];
    }
}
