<?php

namespace Database\Factories;

use App\Models\CustomField;
use App\Models\Record;
use Illuminate\Database\Eloquent\Factories\Factory;

class CustomFieldValueFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'custom_field_id' => CustomField::factory(),
            'module' => fake()->randomElement(["sales_invoice","quotation","sales_order","credit_note","customer_payment","quick_receipt","purchase_order","purchase_bill","expense","debit_note","supplier_payment","quick_payment","journal_voucher","cash_transfer","production_order","production_journal","contact","lead","deal","crm_activity","product","employee","project"]),
            'record_id' => Record::factory(),
            'value' => fake()->text(),
            'value_json' => '{}',
        ];
    }
}
