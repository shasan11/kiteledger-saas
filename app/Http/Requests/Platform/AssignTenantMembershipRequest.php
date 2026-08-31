<?php

namespace App\Http\Requests\Platform;

use App\Enums\TenantMembershipRole;
use App\Models\Central\TenantMembership;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignTenantMembershipRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user('central')?->can('tenant-memberships.manage');
    }

    public function rules(): array
    {
        $user = $this->route('platformUser');

        return [
            'tenant_id' => [
                'required', 'string', 'exists:tenants,id',
                Rule::unique('central_user_tenant_memberships', 'tenant_id')->where(fn ($query) => $query->where('central_user_id', $user?->id)),
            ],
            'role' => ['required', Rule::in(TenantMembershipRole::values())],
            'is_primary' => ['boolean'],
            'permissions' => ['array'],
            'permissions.*' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return ['tenant_id.unique' => 'This user already has a membership for that company.'];
    }

    /**
     * @return array<string, bool>
     */
    public function permissionOverrides(): array
    {
        return collect($this->validated('permissions') ?? [])->only(TenantMembership::PERMISSIONS)->map(fn ($value): bool => (bool) $value)->all();
    }
}
