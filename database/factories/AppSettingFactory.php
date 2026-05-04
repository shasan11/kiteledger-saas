<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AppSettingFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'company_name' => fake()->regexify('[A-Za-z0-9]{180}'),
            'tag_line' => fake()->regexify('[A-Za-z0-9]{200}'),
            'address' => fake()->regexify('[A-Za-z0-9]{255}'),
            'phone' => fake()->phoneNumber(),
            'email' => fake()->safeEmail(),
            'website' => fake()->regexify('[A-Za-z0-9]{180}'),
            'footer' => fake()->text(),
            'logo' => fake()->regexify('[A-Za-z0-9]{255}'),
            'suggest_selling' => fake()->randomElement(["recent","fixed"]),
            'negative_cash_balance' => fake()->randomElement(["reject","warn","do_nothing"]),
            'negative_item_balance' => fake()->randomElement(["reject","warn","do_nothing"]),
            'credit_limit_exceed' => fake()->randomElement(["reject","warn","do_nothing"]),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
