<?php

namespace Database\Factories;

use App\Models\ProductTaxCategory;
use App\Models\TaxJurisdiction;
use App\Models\TaxRate;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaxRuleFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'tax_jurisdiction_id' => TaxJurisdiction::factory(),
            'tax_rate_id' => TaxRate::factory(),
            'product_tax_category_id' => ProductTaxCategory::factory(),
            'country_code' => fake()->randomElement(["NP","IN","US"]),
            'transaction_type' => fake()->randomElement(["sale","purchase","expense","import","export"]),
            'customer_type' => fake()->randomElement(["registered","unregistered","consumer","business","exempt","any"]),
            'supply_type' => fake()->randomElement(["local","intrastate","interstate","import","export","any"]),
            'from_state_code' => fake()->regexify('[A-Za-z0-9]{20}'),
            'to_state_code' => fake()->regexify('[A-Za-z0-9]{20}'),
            'reverse_charge' => fake()->boolean(),
            'priority' => fake()->randomNumber(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
