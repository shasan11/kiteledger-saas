<?php

namespace Database\Factories;

use App\Models\Contact;
use App\Models\ProductTaxCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaxExemptionFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'contact_id' => Contact::factory(),
            'product_tax_category_id' => ProductTaxCategory::factory(),
            'country_code' => fake()->randomElement(["NP","IN","US"]),
            'exemption_no' => fake()->regexify('[A-Za-z0-9]{80}'),
            'reason' => fake()->regexify('[A-Za-z0-9]{180}'),
            'effective_from' => fake()->date(),
            'effective_to' => fake()->date(),
            'attachment' => fake()->regexify('[A-Za-z0-9]{255}'),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
