<?php

namespace App\Services\SaaS;

use App\Enums\TenantMembershipRole;
use App\Models\Central\CentralUser;
use App\Models\Central\Tenant;
use App\Models\Central\TenantMembership;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Every mutation of the central user <-> tenant mapping goes through here so
 * ownership guarantees, primary-tenant uniqueness and auditing cannot drift.
 */
class TenantMembershipService
{
    public function __construct(private readonly CentralAuditService $audit) {}

    /**
     * @param  array<string, bool>  $permissions  Explicit overrides on top of the role defaults.
     */
    public function assign(CentralUser $user, Tenant $tenant, TenantMembershipRole $role, array $permissions = [], ?Model $actor = null, bool $primary = false, bool $accepted = true): TenantMembership
    {
        return $this->transaction(function () use ($user, $tenant, $role, $permissions, $actor, $primary, $accepted): TenantMembership {
            if (TenantMembership::where('central_user_id', $user->id)->where('tenant_id', $tenant->getKey())->exists()) {
                throw ValidationException::withMessages(['tenant_id' => 'This user already has a membership for '.$tenant->company_name.'.']);
            }
            $membership = TenantMembership::create(array_merge(
                $this->resolvePermissions($role, $permissions),
                [
                    'central_user_id' => $user->id,
                    'tenant_id' => $tenant->getKey(),
                    'role' => $role->value,
                    'is_active' => true,
                    'is_primary' => false,
                    'invited_by_type' => $actor?->getMorphClass(),
                    'invited_by_id' => (string) $actor?->getKey(),
                    'invited_at' => now(),
                    'accepted_at' => $accepted ? now() : null,
                ],
            ));
            $user->forgetMembershipCache();
            if ($primary || ! TenantMembership::where('central_user_id', $user->id)->where('is_primary', true)->exists()) {
                $this->applyPrimary($user, $membership);
            }
            $this->audit->log(request(), 'tenant-membership.created', $membership, [], $this->snapshot($membership), ['tenant_id' => $tenant->getKey()]);

            return $membership->refresh();
        });
    }

    /**
     * @param  array<string, bool>  $permissions
     */
    public function updatePermissions(TenantMembership $membership, TenantMembershipRole $role, array $permissions = [], ?bool $isActive = null): TenantMembership
    {
        return $this->transaction(function () use ($membership, $role, $permissions, $isActive): TenantMembership {
            $old = $this->snapshot($membership);
            $stillOwner = $role === TenantMembershipRole::Owner && ($isActive ?? $membership->is_active);
            if ($membership->isOwner() && ! $stillOwner) {
                $this->guardLastOwner($membership, 'demoted or deactivated');
            }
            $membership->fill(array_merge($this->resolvePermissions($role, $permissions), ['role' => $role->value]));
            if ($isActive !== null) {
                $membership->is_active = $isActive;
                if (! $isActive) {
                    $membership->is_primary = false;
                }
            }
            $membership->save();
            $membership->user?->forgetMembershipCache();
            $this->auditPermissionDelta($membership, $old);

            return $membership->refresh();
        });
    }

    /**
     * Soft revoke: history is preserved, access stops immediately.
     */
    public function revoke(TenantMembership $membership, ?string $reason = null): TenantMembership
    {
        return $this->transaction(function () use ($membership, $reason): TenantMembership {
            $old = $this->snapshot($membership);
            if ($membership->isOwner() && $membership->isUsable()) {
                $this->guardLastOwner($membership, 'revoked');
            }
            $wasPrimary = $membership->is_primary;
            $membership->forceFill(['is_active' => false, 'is_primary' => false, 'revoked_at' => now(), 'metadata' => array_merge($membership->metadata ?? [], array_filter(['revoke_reason' => $reason]))])->save();
            $user = $membership->user;
            $user?->forgetMembershipCache();
            if ($wasPrimary && $user) {
                $this->promoteReplacementPrimary($user);
            }
            $this->audit->log(request(), 'tenant-membership.revoked', $membership, $old, $this->snapshot($membership), ['tenant_id' => $membership->tenant_id]);

            return $membership->refresh();
        });
    }

    public function restore(TenantMembership $membership): TenantMembership
    {
        return $this->transaction(function () use ($membership): TenantMembership {
            $old = $this->snapshot($membership);
            $membership->forceFill(['is_active' => true, 'revoked_at' => null, 'accepted_at' => $membership->accepted_at ?? now()])->save();
            $membership->user?->forgetMembershipCache();
            $this->audit->log(request(), 'tenant-membership.updated', $membership, $old, $this->snapshot($membership), ['tenant_id' => $membership->tenant_id]);

            return $membership->refresh();
        });
    }

    public function setPrimary(CentralUser $user, TenantMembership $membership): TenantMembership
    {
        return $this->transaction(function () use ($user, $membership): TenantMembership {
            if ((int) $membership->central_user_id !== (int) $user->id) {
                throw ValidationException::withMessages(['membership' => 'That membership belongs to another account.']);
            }
            if (! $membership->isUsable()) {
                throw ValidationException::withMessages(['membership' => 'A revoked membership cannot be the primary company.']);
            }
            $this->applyPrimary($user, $membership);
            $this->audit->log(request(), 'tenant-membership.primary_changed', $membership, [], ['tenant_id' => $membership->tenant_id], ['tenant_id' => $membership->tenant_id]);

            return $membership->refresh();
        });
    }

    /**
     * Merge role defaults with explicit overrides. Owners always keep every flag
     * so a tenant can never end up with an owner who cannot administer it.
     *
     * @param  array<string, bool>  $permissions
     * @return array<string, bool>
     */
    public function resolvePermissions(TenantMembershipRole $role, array $permissions = []): array
    {
        $resolved = $role->defaultPermissions();
        if ($role === TenantMembershipRole::Owner) {
            return $resolved;
        }
        foreach ($permissions as $key => $value) {
            if (array_key_exists($key, $resolved)) {
                $resolved[$key] = (bool) $value;
            }
        }

        return $resolved;
    }

    private function transaction(callable $callback): mixed
    {
        return DB::connection(config('tenancy.database.central_connection'))->transaction($callback);
    }

    private function applyPrimary(CentralUser $user, TenantMembership $membership): void
    {
        TenantMembership::where('central_user_id', $user->id)->whereKeyNot($membership->id)->where('is_primary', true)->update(['is_primary' => false]);
        $membership->forceFill(['is_primary' => true])->save();
    }

    private function promoteReplacementPrimary(CentralUser $user): void
    {
        $replacement = TenantMembership::where('central_user_id', $user->id)->active()->where('can_access_tenant', true)->orderBy('id')->first();
        if ($replacement) {
            $this->applyPrimary($user, $replacement);
        }
    }

    /**
     * A tenant must always retain at least one active owner.
     */
    private function guardLastOwner(TenantMembership $membership, string $verb): void
    {
        $otherOwners = TenantMembership::where('tenant_id', $membership->tenant_id)
            ->whereKeyNot($membership->id)
            ->where('role', TenantMembershipRole::Owner->value)
            ->active()
            ->exists();
        if (! $otherOwners) {
            throw ValidationException::withMessages(['role' => 'The last active owner of this company cannot be '.$verb.'. Transfer ownership to another member first.']);
        }
    }

    private function auditPermissionDelta(TenantMembership $membership, array $old): void
    {
        $new = $this->snapshot($membership);
        $context = ['tenant_id' => $membership->tenant_id];
        $this->audit->log(request(), 'tenant-membership.updated', $membership, $old, $new, $context);
        if (($old['can_manage_billing'] ?? null) !== $new['can_manage_billing'] || ($old['can_make_payments'] ?? null) !== $new['can_make_payments'] || ($old['can_view_invoices'] ?? null) !== $new['can_view_invoices']) {
            $this->audit->log(request(), 'platform-user.billing_access_changed', $membership, $old, $new, $context);
        }
        if (($old['can_manage_plan'] ?? null) !== $new['can_manage_plan']) {
            $this->audit->log(request(), 'platform-user.plan_access_changed', $membership, $old, $new, $context);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function snapshot(TenantMembership $membership): array
    {
        return array_merge($membership->permissionMap(), [
            'tenant_id' => $membership->tenant_id,
            'role' => $membership->role?->value,
            'is_active' => $membership->is_active,
            'is_primary' => $membership->is_primary,
        ]);
    }
}
