<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class DocumentNumberingFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'document_type' => fake()->randomElement(["quotation","sales_order","proforma","invoice","sales_return","purchase_order","purchase_bill","debit_note","customer_payment","supplier_payment","cash_transfer","journal_voucher","expense","warehouse_transfer","inventory_adjustment"]),
            'prefix' => fake()->regexify('[A-Za-z0-9]{20}'),
            'next_number' => fake()->randomNumber(),
            'padding' => fake()->randomDigitNotNull(),
            'active' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
