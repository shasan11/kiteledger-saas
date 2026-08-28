<?php

namespace App\Http\Requests\Platform;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class UpdatePlatformProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        $target = $this->route('platformUser') ?? $this->user('platform');
        $actor = $this->user('central') ?? $this->user('platform');

        return $target !== null && Gate::forUser($actor)->allows('update', $target);
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:120'],
            'last_name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'avatar' => ['nullable', 'string', 'max:2048'],
            'job_title' => ['nullable', 'string', 'max:150'],
            'company' => ['nullable', 'string', 'max:150'],
            'phone_secondary' => ['nullable', 'string', 'max:40'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'address_line_1' => ['nullable', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:120'],
            'state' => ['nullable', 'string', 'max:120'],
            'postal_code' => ['nullable', 'string', 'max:32'],
            'country' => ['nullable', 'string', 'size:2'],
            'preferred_currency' => ['nullable', 'string', 'size:3'],
            'preferred_language' => ['nullable', 'string', 'max:10'],
            'timezone' => ['nullable', 'string', 'max:64'],
            'bio' => ['nullable', 'string', 'max:2000'],
            'notification_preferences' => ['nullable', 'array'],
            'notification_preferences.*' => ['boolean'],
        ];
    }
}
