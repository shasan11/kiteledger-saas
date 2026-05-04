<?php

namespace Database\Factories;

use App\Models\ChartOfAccount;
use App\Models\TaxRate;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaxRateComponentFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'tax_rate_id' => TaxRate::factory(),
            'component_name' => fake()->regexify('[A-Za-z0-9]{80}'),
            'component_type' => fake()->randomElement(["vat","cgst","sgst","igst","state_tax","county_tax","city_tax","special_tax","tds","tcs","withholding"]),
            'rate_percent' => fake()->randomFloat(4, 0, 9999.9999),
            'account_id' => ChartOfAccount::factory(),
            'sort_order' => fake()->randomNumber(),
            'active' => fake()->boolean(),
            'chart_of_account_id' => ChartOfAccount::factory(),
        ];
    }
}
