<?php

namespace Database\Factories;

use App\Models\TaxJurisdiction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaxClassFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'tax_jurisdiction_id' => TaxJurisdiction::factory(),
            'country_code' => fake()->randomElement(["NP","IN","US"]),
            'name' => fake()->name(),
            'code' => fake()->regexify('[A-Za-z0-9]{30}'),
            'tax_type' => fake()->randomElement(["vat","gst","sales_tax","use_tax","withholding","tds","tcs","exempt","zero_rated"]),
            'tax_behavior' => fake()->randomElement(["standard","exempt","zero_rated","reverse_charge","out_of_scope"]),
            'description' => fake()->text(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
