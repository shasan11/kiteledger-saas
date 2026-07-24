<?php

namespace App\Http\Requests\Central;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreManualPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user('central')?->can('payment.add_manual');
    }

    public function rules(): array
    {
        return [
            'tenant_id' => ['nullable', 'string', 'exists:tenants,id'], 'invoice_id' => ['required', 'integer', 'exists:tenant_invoices,id'],
            'amount' => ['required', 'numeric', 'gt:0'], 'currency' => ['required', 'string', 'size:3'],
            'payment_date' => ['required', 'date', 'before_or_equal:now'],
            'payment_method' => ['required', Rule::in(['bank_transfer', 'cash', 'cheque', 'card_terminal', 'other'])],
            'reference' => ['required', 'string', 'max:255'], 'bank_reference' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'], 'proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
            'send_receipt' => ['boolean'], 'idempotency_key' => ['required', 'uuid'],
        ];
    }
}
