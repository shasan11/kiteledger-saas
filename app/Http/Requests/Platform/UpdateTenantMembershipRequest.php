<?php

namespace App\Http\Requests\Platform;

use App\Enums\TenantMembershipRole;
use App\Models\Central\TenantMembership;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateTenantMembershipRequest extends FormRequest
{
    public function authorize(): bool
    {
        $actor = $this->user('central') ?? $this->user('platform');

        return Gate::forUser($actor)->allows('update', $this->route('membership'));
    }

    public function rules(): array
    {
        return [
            'role' => ['required', Rule::in(TenantMembershipRole::values())],
            'is_active' => ['boolean'],
            'permissions' => ['array'],
            'permissions.*' => ['boolean'],
        ];
    }

    /**
     * @return array<string, bool>
     */
    public function permissionOverrides(): array
    {
        return collect($this->validated('permissions') ?? [])->only(TenantMembership::PERMISSIONS)->map(fn ($value): bool => (bool) $value)->all();
    }
}
