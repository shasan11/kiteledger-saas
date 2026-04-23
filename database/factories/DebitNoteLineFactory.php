<?php

namespace Database\Factories;

use App\Models\DebitNote;
use App\Models\ProductVariant;
use App\Models\TaxRate;
use Illuminate\Database\Eloquent\Factories\Factory;

class DebitNoteLineFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'debit_note_id' => DebitNote::factory(),
            'product_variant_id' => ProductVariant::factory(),
            'description' => fake()->text(),
            'qty' => fake()->randomFloat(4, 0, 999999999999.9999),
            'unit_price' => fake()->randomFloat(2, 0, 99999999999999.99),
            'tax_rate_id' => TaxRate::factory(),
            'tax_amount' => fake()->randomFloat(2, 0, 99999999999999.99),
            'line_total' => fake()->randomFloat(2, 0, 99999999999999.99),
        ];
    }
}
