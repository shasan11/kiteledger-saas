<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaxJurisdictionFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'country_code' => fake()->randomElement(["NP","IN","US"]),
            'state_code' => fake()->regexify('[A-Za-z0-9]{20}'),
            'county_name' => fake()->regexify('[A-Za-z0-9]{120}'),
            'city_name' => fake()->regexify('[A-Za-z0-9]{120}'),
            'name' => fake()->name(),
            'code' => fake()->regexify('[A-Za-z0-9]{50}'),
            'tax_system' => fake()->randomElement(["nepal_vat","india_gst","usa_sales_tax","withholding","custom"]),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
