<?php

namespace App\Services\SaaS;

use App\Models\Central\CentralUser;
use App\Models\Central\Tenant;
use App\Models\Central\TenantMembership;
use Illuminate\Database\Eloquent\Collection;

/**
 * Single source of truth for "may this platform user do X in this tenant?".
 * Controllers, middleware and policies all delegate here so the rule lives once.
 */
class TenantAccessService
{
    /**
     * Tenants the user may open, primary membership first.
     *
     * @return Collection<int, Tenant>
     */
    public function getAccessibleTenants(CentralUser $user, array $with = []): Collection
    {
        if (! $user->isPlatformActive()) {
            return Tenant::query()->whereRaw('1 = 0')->get();
        }

        return $user->accessibleTenants()
            ->with($with)
            ->orderByDesc('central_user_tenant_memberships.is_primary')
            ->orderBy('tenants.company_name')
            ->get();
    }

    /**
     * Resolve a tenant strictly through the user's own memberships. Never
     * Tenant::find() on request input — that is the IDOR the portal must avoid.
     */
    public function resolveAccessibleTenant(CentralUser $user, ?string $tenantId): ?Tenant
    {
        if (blank($tenantId) || ! $user->isPlatformActive()) {
            return null;
        }

        return $user->accessibleTenants()->whereKey($tenantId)->first();
    }

    /**
     * Compact payload for the dashboard cards and the tenant switcher.
     * Eager-loads plan + subscription so neither view triggers N+1 queries.
     *
     * @return array<int, array<string, mixed>>
     */
    public function tenantCards(CentralUser $user): array
    {
        $tenants = $this->getAccessibleTenants($user, ['plan:id,name,slug', 'subscription:subscriptions.id,subscriptions.tenant_id,subscriptions.plan_id,subscriptions.status,subscriptions.billing_cycle,subscriptions.current_period_ends_at', 'subscription.plan:id,name']);

        return $tenants->map(function (Tenant $tenant) use ($user): array {
            $membership = $this->getMembership($user, $tenant);

            return [
                'id' => $tenant->getKey(),
                'company_name' => $tenant->company_name,
                'status' => is_string($tenant->status) ? $tenant->status : $tenant->status?->value,
                'currency' => $tenant->currency,
                'role' => $membership?->role?->value,
                'role_label' => $membership?->role?->label(),
                'is_primary' => (bool) $membership?->is_primary,
                'plan' => $tenant->subscription?->plan?->name ?? $tenant->plan?->name,
                'subscription_status' => $tenant->subscription?->status,
                'renews_at' => $tenant->subscription?->current_period_ends_at,
                'can_manage_billing' => (bool) $membership?->grants('can_manage_billing'),
                'can_manage_plan' => (bool) $membership?->grants('can_manage_plan'),
                'can_view_invoices' => (bool) $membership?->grants('can_view_invoices'),
                'can_manage_users' => (bool) $membership?->grants('can_manage_users'),
                'can_manage_company' => (bool) $membership?->grants('can_manage_company'),
            ];
        })->all();
    }

    public function getMembership(CentralUser $user, Tenant|string|null $tenant): ?TenantMembership
    {
        return $user->membershipFor($tenant);
    }

    public function canAccessTenant(CentralUser $user, Tenant|string|null $tenant): bool
    {
        return $user->canAccessTenant($tenant);
    }

    public function canManageUsers(CentralUser $user, Tenant|string|null $tenant): bool
    {
        return $user->canManageTenantUsers($tenant);
    }

    public function canManageBilling(CentralUser $user, Tenant|string|null $tenant): bool
    {
        return $user->canManageTenantBilling($tenant);
    }

    public function canManagePlan(CentralUser $user, Tenant|string|null $tenant): bool
    {
        return $user->canManageTenantPlan($tenant);
    }

    public function canViewInvoices(CentralUser $user, Tenant|string|null $tenant): bool
    {
        return $user->canViewTenantInvoices($tenant);
    }

    public function canMakePayments(CentralUser $user, Tenant|string|null $tenant): bool
    {
        return $user->canMakeTenantPayments($tenant);
    }

    public function canManageCompany(CentralUser $user, Tenant|string|null $tenant): bool
    {
        return $user->canManageTenantCompany($tenant);
    }

    public function canManageIntegrations(CentralUser $user, Tenant|string|null $tenant): bool
    {
        return $user->hasTenantPermission($tenant, 'can_manage_integrations');
    }

    /**
     * Membership capabilities as a flat map, for sharing with the frontend.
     * Frontend uses it to hide controls only; the backend stays authoritative.
     *
     * @return array<string, bool|string|null>
     */
    public function abilities(CentralUser $user, Tenant|string|null $tenant): array
    {
        $membership = $this->getMembership($user, $tenant);
        $granted = collect(TenantMembership::PERMISSIONS)
            ->mapWithKeys(fn (string $permission): array => [$permission => (bool) $membership?->grants($permission)])
            ->all();

        return array_merge($granted, [
            'role' => $membership?->role?->value,
            'role_label' => $membership?->role?->label(),
            'is_primary' => (bool) $membership?->is_primary,
            'is_owner' => (bool) $membership?->isOwner(),
        ]);
    }
}
