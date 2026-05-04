<?php

namespace Database\Factories;

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
            'document_type' => fake()->randomElement(["cash_transfer","credit_note","debit_note","expense","inventory_adjustment","invoice","journal_voucher","payment","production_journal","production_order","purchase_bill","purchase_order","quotation","receipt","sales_order","sales_return","warehouse_transfer","payroll","deduction","increment","contact","lead","deal","product","bank_account","capital","cash","current_asset","current_liability","direct_expense","direct_income","indirect_expense","indirect_income","non_current_asset","non_current_liability","reserve_surplus","loan_account","loan_topup","loan_charge"]),
            'prefix' => fake()->regexify('[A-Za-z0-9]{20}'),
            'next_number' => fake()->randomNumber(),
            'type_of_account' => fake()->randomElement(["auto_numbering","manual_numbering"]),
            'reset_every_fiscal_year' => fake()->boolean(),
            'add_fiscal_year_in_code' => fake()->boolean(),
            'enable_fiscal_year_next_number' => fake()->boolean(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
