<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;

class StorePosReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
            'pos_sale_id' => ['required', 'uuid', 'exists:pos_sales,id'],
            'pos_shift_id' => ['nullable', 'uuid', 'exists:pos_shifts,id'],
            'return_date' => ['nullable', 'date'],
            'refund_method' => ['required', 'in:cash,card,online,wallet,store_credit'],
            'reason' => ['nullable', 'string', 'max:180'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.pos_sale_line_id' => ['required', 'uuid', 'exists:pos_sale_lines,id'],
            'items.*.qty' => ['required', 'numeric', 'gt:0'],
            'items.*.remarks' => ['nullable', 'string', 'max:200'],
        ];
    }
}
