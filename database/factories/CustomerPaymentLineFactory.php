<?php

namespace Database\Factories;

use App\Models\CustomerPayment;
use App\Models\Invoice;
use Illuminate\Database\Eloquent\Factories\Factory;

class CustomerPaymentLineFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'customer_payment_id' => CustomerPayment::factory(),
            'invoice_id' => Invoice::factory(),
            'allocated_amount' => fake()->randomFloat(2, 0, 99999999999999.99),
        ];
    }
}
