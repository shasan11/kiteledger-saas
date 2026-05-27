<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePosTerminalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $terminalId = $this->route('pos_terminal')?->id ?? $this->route('id');

        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'warehouse_id' => ['sometimes', 'nullable', 'uuid', 'exists:warehouses,id'],
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'code' => ['sometimes', 'nullable', 'string', 'max:40', Rule::unique('pos_terminals', 'code')->ignore($terminalId)],
            'location' => ['sometimes', 'nullable', 'string', 'max:150'],
            'floor_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'x_position' => ['sometimes', 'integer', 'min:0', 'max:5000'],
            'y_position' => ['sometimes', 'integer', 'min:0', 'max:5000'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'status' => ['sometimes', 'nullable', 'string', 'max:40'],
            'receipt_printer_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'cash_account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'card_account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'online_account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'default_customer_id' => ['sometimes', 'nullable', 'uuid', 'exists:contacts,id'],
            'is_default' => ['sometimes', 'boolean'],
            'active' => ['sometimes', 'boolean'],
        ];
    }
}
