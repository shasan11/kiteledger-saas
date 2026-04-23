<?php

namespace Database\Factories;

use App\Models\PurchaseBill;
use App\Models\SupplierPayment;
use Illuminate\Database\Eloquent\Factories\Factory;

class SupplierPaymentLineFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'supplier_payment_id' => SupplierPayment::factory(),
            'purchase_bill_id' => PurchaseBill::factory(),
            'allocated_amount' => fake()->randomFloat(2, 0, 99999999999999.99),
        ];
    }
}
