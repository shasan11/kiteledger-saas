<?php

namespace App\Http\Requests\Platform;

use App\Enums\TenantMembershipRole;
use App\Models\Central\TenantMembership;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Used by both the central control centre and a tenant owner inviting a
 * colleague. Tenant authorisation is enforced by route middleware/policy.
 */
class InvitePlatformUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user('central') !== null || $this->user('platform') !== null;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255'],
            'tenant_id' => [Rule::requiredIf(fn (): bool => ! $this->route('tenant')), 'nullable', 'string', 'exists:tenants,id'],
            'role' => ['required', Rule::in(TenantMembershipRole::values())],
            'permissions' => ['array'],
            'permissions.*' => ['boolean'],
        ];
    }

    public function prepareForValidation(): void
    {
        $this->merge(['email' => mb_strtolower(trim((string) $this->input('email')))]);
    }

    /**
     * @return array<string, bool>
     */
    public function permissionOverrides(): array
    {
        return collect($this->validated('permissions') ?? [])->only(TenantMembership::PERMISSIONS)->map(fn ($value): bool => (bool) $value)->all();
    }
}
