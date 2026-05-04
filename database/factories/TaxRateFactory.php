<?php

namespace Database\Factories;

use App\Models\TaxClass;
use App\Models\TaxJurisdiction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaxRateFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'tax_class_id' => TaxClass::factory(),
            'tax_jurisdiction_id' => TaxJurisdiction::factory(),
            'country_code' => fake()->randomElement(["NP","IN","US"]),
            'tax_type' => fake()->randomElement(["vat","gst","sales_tax","use_tax","withholding","tds","tcs"]),
            'name' => fake()->name(),
            'code' => fake()->regexify('[A-Za-z0-9]{50}'),
            'rate_percent' => fake()->randomFloat(4, 0, 9999.9999),
            'inclusive' => fake()->boolean(),
            'calculation_method' => fake()->randomElement(["single","split","compound"]),
            'applies_on' => fake()->randomElement(["sale","purchase","both","expense"]),
            'effective_from' => fake()->date(),
            'effective_to' => fake()->date(),
            'report_code' => fake()->regexify('[A-Za-z0-9]{80}'),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
