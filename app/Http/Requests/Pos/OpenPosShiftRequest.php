<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;

class OpenPosShiftRequest extends FormRequest
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
            'cashier_id' => ['nullable', 'integer', 'exists:users,id'],
            'opened_at' => ['nullable', 'date'],
            'opening_cash' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
