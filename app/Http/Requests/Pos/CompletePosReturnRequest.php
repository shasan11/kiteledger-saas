<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;

class CompletePosReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'approved' => ['nullable', 'boolean'],
            'refund_method' => ['nullable', 'in:cash,card,online,wallet,store_credit'],
            'reason' => ['nullable', 'string', 'max:180'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
