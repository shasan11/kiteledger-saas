<?php

namespace App\Http\Requests\Platform;

use App\Enums\PlatformUserStatus;
use App\Enums\TenantMembershipRole;
use App\Models\Central\CentralUser;
use App\Models\Central\TenantMembership;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreCentralUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::forUser($this->user('central'))->allows('create', CentralUser::class);
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:120'],
            'last_name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', Rule::unique('central_users', 'email')->whereNull('deleted_at')],
            'phone' => ['nullable', 'string', 'max:40'],
            'timezone' => ['nullable', 'string', 'max:64'],
            'country' => ['nullable', 'string', 'size:2'],
            'status' => ['nullable', Rule::in(PlatformUserStatus::values())],
            'is_active' => ['boolean'],
            'send_invitation' => ['boolean'],
            'password' => [Rule::requiredIf(fn (): bool => ! $this->boolean('send_invitation')), 'nullable', 'confirmed', Password::min(12)],
            'memberships' => ['array'],
            'memberships.*.tenant_id' => ['required', 'string', 'distinct', 'exists:tenants,id'],
            'memberships.*.role' => ['required', Rule::in(TenantMembershipRole::values())],
            'memberships.*.is_primary' => ['boolean'],
            'memberships.*.permissions' => ['array'],
            'memberships.*.permissions.*' => ['boolean'],
        ];
    }

    public function prepareForValidation(): void
    {
        $this->merge(['email' => mb_strtolower(trim((string) $this->input('email')))]);
    }

    /**
     * @return array<int, array{tenant_id: string, role: string, is_primary: bool, permissions: array<string, bool>}>
     */
    public function membershipAssignments(): array
    {
        return collect($this->validated('memberships') ?? [])->map(fn (array $row): array => [
            'tenant_id' => $row['tenant_id'],
            'role' => $row['role'],
            'is_primary' => (bool) ($row['is_primary'] ?? false),
            'permissions' => collect($row['permissions'] ?? [])->only(TenantMembership::PERMISSIONS)->map(fn ($value): bool => (bool) $value)->all(),
        ])->all();
    }
}
