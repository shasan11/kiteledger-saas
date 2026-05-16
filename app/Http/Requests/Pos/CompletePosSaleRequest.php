<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;

class CompletePosSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'contact_id' => ['nullable', 'uuid', 'exists:contacts,id'],
            'customer_name' => ['nullable', 'string', 'max:180'],
            'customer_phone' => ['nullable', 'string', 'max:40'],
            'customer_email' => ['nullable', 'email', 'max:120'],
            'sale_date' => ['nullable', 'date'],
            'approved' => ['nullable', 'boolean'],
            'receipt_note' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'round_off' => ['nullable', 'numeric'],
            'allow_credit_sale' => ['nullable', 'boolean'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['nullable', 'uuid'],
            'items.*.product_id' => ['nullable', 'uuid', 'exists:products,id'],
            'items.*.product_name' => ['nullable', 'string', 'max:180'],
            'items.*.product_code' => ['nullable', 'string', 'max:80'],
            'items.*.barcode' => ['nullable', 'string', 'max:80'],
            'items.*.qty' => ['required', 'numeric', 'gt:0'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount_percent' => ['nullable', 'numeric', 'min:0'],
            'items.*.discount_amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.tax_rate_id' => ['nullable', 'uuid', 'exists:tax_rates,id'],
            'items.*.is_complimentary' => ['nullable', 'boolean'],
            'items.*.complimentary_reason' => ['nullable', 'string', 'max:180'],
            'items.*.remarks' => ['nullable', 'string', 'max:200'],
            'payments' => ['nullable', 'array'],
            'payments.*.id' => ['nullable', 'uuid'],
            'payments.*.payment_date' => ['nullable', 'date'],
            'payments.*.payment_method' => ['required_with:payments', 'in:cash,card,online,wallet,bank_transfer,credit,mixed'],
            'payments.*.account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
            'payments.*.amount' => ['required_with:payments', 'numeric', 'gt:0'],
            'payments.*.reference' => ['nullable', 'string', 'max:120'],
            'payments.*.card_last_four' => ['nullable', 'string', 'max:4'],
            'payments.*.transaction_no' => ['nullable', 'string', 'max:120'],
            'payments.*.notes' => ['nullable', 'string'],
        ];
    }
}
