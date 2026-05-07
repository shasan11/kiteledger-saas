<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;

class ClosePosShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'closed_at' => ['nullable', 'date'],
            'counted_cash' => ['required', 'numeric', 'min:0'],
            'closing_notes' => ['nullable', 'string'],
        ];
    }
}
