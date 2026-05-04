<?php

namespace Database\Factories;

use App\Models\TaxJurisdiction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaxRegistrationFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'tax_jurisdiction_id' => TaxJurisdiction::factory(),
            'registration_type' => fake()->randomElement(["pan","vat","gstin","tan","ein","sales_tax_permit","state_tax_id"]),
            'registration_no' => fake()->regexify('[A-Za-z0-9]{80}'),
            'legal_name' => fake()->regexify('[A-Za-z0-9]{180}'),
            'effective_from' => fake()->date(),
            'effective_to' => fake()->date(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
