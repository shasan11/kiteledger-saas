<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;

class StorePosCashMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
            'pos_terminal_id' => ['required', 'uuid', 'exists:pos_terminals,id'],
            'pos_shift_id' => ['required', 'uuid', 'exists:pos_shifts,id'],
            'movement_date' => ['nullable', 'date'],
            'type' => ['required', 'in:cash_in,cash_out,expense,drop'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'reason' => ['nullable', 'string', 'max:180'],
            'notes' => ['nullable', 'string'],
            'account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
            'approved' => ['nullable', 'boolean'],
        ];
    }
}
