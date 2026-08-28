<?php

namespace App\Http\Controllers\Platform;

use App\Enums\TenantMembershipRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\InvitePlatformUserRequest;
use App\Http\Requests\Platform\UpdateTenantMembershipRequest;
use App\Models\Central\CentralUserInvitation;
use App\Models\Central\Tenant;
use App\Models\Central\TenantMembership;
use App\Services\SaaS\CentralAuditService;
use App\Services\SaaS\PlatformInvitationService;
use App\Services\SaaS\TenantAccessService;
use App\Services\SaaS\TenantMembershipService;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Tenant-scoped customer screens. The tenant is always the one resolved by
 * EnsurePlatformUserCanAccessTenant — never an id read from the request body.
 */
class TenantController extends Controller
{
    public function show(Request $request, TenantAccessService $access)
    {
        $tenant = $this->tenant($request);
        $tenant->load(['plan:id,name,slug', 'subscription:subscriptions.id,subscriptions.tenant_id,subscriptions.plan_id,subscriptions.status,subscriptions.billing_cycle,subscriptions.current_period_ends_at,subscriptions.trial_ends_at', 'subscription.plan:id,name', 'domains:id,tenant_id,domain,is_primary,status']);

        return Inertia::render('Platform/Tenants/Show', [
            'tenant' => $this->tenantPayload($tenant),
            'abilities' => $access->abilities($request->user('platform'), $tenant),
            'memberCount' => TenantMembership::where('tenant_id', $tenant->getKey())->active()->count(),
        ]);
    }

    public function settings(Request $request, TenantAccessService $access)
    {
        $tenant = $this->tenant($request);
        $tenant->load(['plan:id,name,slug', 'subscription:subscriptions.id,subscriptions.tenant_id,subscriptions.plan_id,subscriptions.status,subscriptions.billing_cycle,subscriptions.current_period_ends_at', 'domains:id,tenant_id,domain,is_primary,status']);

        return Inertia::render('Platform/Tenants/Settings', [
            'tenant' => $this->tenantPayload($tenant),
            'abilities' => $access->abilities($request->user('platform'), $tenant),
        ]);
    }

    public function updateSettings(Request $request, CentralAuditService $audit)
    {
        $tenant = $this->tenant($request);
        $this->authorize('manageTenant', $tenant);
        // Explicit allowlist. Database credentials, status, plan and provisioning
        // fields are never mass-assignable from a customer request.
        $data = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'owner_name' => ['required', 'string', 'max:255'],
            'owner_email' => ['required', 'email', 'max:255'],
            'owner_phone' => ['nullable', 'string', 'max:40'],
            'country' => ['nullable', 'string', 'size:2'],
            'address' => ['nullable', 'string', 'max:1000'],
            'timezone' => ['nullable', 'string', 'max:64'],
        ]);
        $old = $tenant->only(array_keys($data));
        $tenant->fill($data)->save();
        $audit->log($request, 'tenant.updated_by_platform_user', $tenant, $old, $data, ['tenant_id' => $tenant->getKey()]);

        return back()->with('success', 'Company details updated.');
    }

    public function members(Request $request, TenantAccessService $access)
    {
        $tenant = $this->tenant($request);
        $this->authorize('manageUsers', $tenant);

        return Inertia::render('Platform/Tenants/Members', [
            'tenant' => $this->tenantPayload($tenant),
            'abilities' => $access->abilities($request->user('platform'), $tenant),
            'members' => TenantMembership::where('tenant_id', $tenant->getKey())
                ->with('user:id,name,email,avatar,status,last_active_at')
                ->orderByDesc('is_active')->orderBy('id')->get(),
            'invitations' => CentralUserInvitation::where('tenant_id', $tenant->getKey())->pending()->get(['id', 'email', 'role', 'expires_at', 'created_at']),
            'roleOptions' => TenantMembershipRole::options(),
            'permissionKeys' => TenantMembership::PERMISSIONS,
        ]);
    }

    public function inviteMember(InvitePlatformUserRequest $request, PlatformInvitationService $invitations)
    {
        $tenant = $this->tenant($request);
        $this->authorize('manageUsers', $tenant);
        $invitations->invite($tenant, $request->validated('email'), TenantMembershipRole::from($request->validated('role')), $request->permissionOverrides(), $request->user('platform'));

        return back()->with('success', 'Invitation sent.');
    }

    public function updateMember(UpdateTenantMembershipRequest $request, string $tenant, TenantMembership $membership, TenantMembershipService $service)
    {
        $resolved = $this->tenant($request);
        $this->authorize('manageUsers', $resolved);
        abort_unless($membership->tenant_id === $resolved->getKey(), 404);
        $service->updatePermissions(
            $membership,
            TenantMembershipRole::from($request->validated('role')),
            $request->permissionOverrides(),
            $request->has('is_active') ? $request->boolean('is_active') : null,
        );

        return back()->with('success', 'Member updated.');
    }

    public function revokeMember(Request $request, string $tenant, TenantMembership $membership, TenantMembershipService $service)
    {
        $resolved = $this->tenant($request);
        $this->authorize('manageUsers', $resolved);
        abort_unless($membership->tenant_id === $resolved->getKey(), 404);
        $reason = $request->validate(['reason' => ['nullable', 'string', 'max:500']])['reason'] ?? null;
        $service->revoke($membership, $reason);

        return back()->with('success', 'Member access revoked.');
    }

    private function tenant(Request $request): Tenant
    {
        $tenant = $request->attributes->get('platformTenant');
        abort_unless($tenant instanceof Tenant, 403);

        return $tenant;
    }

    /**
     * @return array<string, mixed>
     */
    private function tenantPayload(Tenant $tenant): array
    {
        return [
            'id' => $tenant->getKey(),
            'company_name' => $tenant->company_name,
            'legal_name' => $tenant->legal_name,
            'owner_name' => $tenant->owner_name,
            'owner_email' => $tenant->owner_email,
            'owner_phone' => $tenant->owner_phone,
            'country' => $tenant->country,
            'address' => $tenant->address,
            'timezone' => $tenant->timezone,
            'currency' => $tenant->currency,
            'status' => is_string($tenant->status) ? $tenant->status : $tenant->status?->value,
            'domains' => $tenant->relationLoaded('domains') ? $tenant->domains->map(fn ($domain): array => ['domain' => $domain->domain, 'is_primary' => (bool) $domain->is_primary, 'status' => $domain->status])->all() : [],
            'plan' => $tenant->subscription?->plan?->name ?? $tenant->plan?->name,
            'subscription' => $tenant->subscription?->only(['status', 'billing_cycle', 'current_period_ends_at', 'trial_ends_at']),
        ];
    }
}
