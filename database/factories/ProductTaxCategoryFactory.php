<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductTaxCategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'country_code' => fake()->randomElement(["NP","IN","US"]),
            'code' => fake()->regexify('[A-Za-z0-9]{80}'),
            'name' => fake()->name(),
            'tax_category_type' => fake()->randomElement(["goods","service","expense","exempt","zero_rated","non_taxable"]),
            'hsn_sac_code' => fake()->regexify('[A-Za-z0-9]{30}'),
            'description' => fake()->text(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
