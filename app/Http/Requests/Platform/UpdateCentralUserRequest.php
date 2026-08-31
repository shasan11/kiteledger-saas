<?php

namespace App\Http\Requests\Platform;

use App\Enums\PlatformUserStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateCentralUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::forUser($this->user('central'))->allows('update', $this->route('platformUser'));
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:120'],
            'last_name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', Rule::unique('central_users', 'email')->ignore($this->route('platformUser'))->whereNull('deleted_at')],
            'phone' => ['nullable', 'string', 'max:40'],
            'timezone' => ['nullable', 'string', 'max:64'],
            'country' => ['nullable', 'string', 'size:2'],
            'status' => ['required', Rule::in(PlatformUserStatus::values())],
            'is_active' => ['boolean'],
            'password' => ['nullable', 'confirmed', Password::min(12)],
        ];
    }

    public function prepareForValidation(): void
    {
        $this->merge(['email' => mb_strtolower(trim((string) $this->input('email')))]);
    }
}
