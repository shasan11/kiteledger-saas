<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;

class StorePosTerminalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
            'warehouse_id' => ['nullable', 'uuid', 'exists:warehouses,id'],
            'name' => ['required', 'string', 'max:150'],
            'code' => ['required', 'string', 'max:40', 'unique:pos_terminals,code'],
            'location' => ['nullable', 'string', 'max:150'],
            'receipt_printer_name' => ['nullable', 'string', 'max:120'],
            'cash_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
            'card_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
            'online_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
            'default_customer_id' => ['nullable', 'uuid', 'exists:contacts,id'],
            'is_default' => ['nullable', 'boolean'],
            'active' => ['nullable', 'boolean'],
        ];
    }
}
