<?php

namespace App\Http\Controllers\Central;

use App\Enums\TenantMembershipRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\AssignTenantMembershipRequest;
use App\Http\Requests\Platform\InvitePlatformUserRequest;
use App\Http\Requests\Platform\UpdateTenantMembershipRequest;
use App\Models\Central\CentralUser;
use App\Models\Central\CentralUserInvitation;
use App\Models\Central\Tenant;
use App\Models\Central\TenantMembership;
use App\Services\SaaS\PlatformInvitationService;
use App\Services\SaaS\TenantMembershipService;
use Illuminate\Http\Request;

class PlatformMembershipController extends Controller
{
    public function store(AssignTenantMembershipRequest $request, CentralUser $platformUser, TenantMembershipService $service)
    {
        $tenant = Tenant::findOrFail($request->validated('tenant_id'));
        $service->assign(
            $platformUser,
            $tenant,
            TenantMembershipRole::from($request->validated('role')),
            $request->permissionOverrides(),
            $request->user('central'),
            $request->boolean('is_primary'),
        );

        return back()->with('success', 'Tenant access granted.');
    }

    public function update(UpdateTenantMembershipRequest $request, CentralUser $platformUser, TenantMembership $membership, TenantMembershipService $service)
    {
        abort_unless((int) $membership->central_user_id === (int) $platformUser->id, 404);
        $service->updatePermissions(
            $membership,
            TenantMembershipRole::from($request->validated('role')),
            $request->permissionOverrides(),
            $request->has('is_active') ? $request->boolean('is_active') : null,
        );

        return back()->with('success', 'Membership updated.');
    }

    public function setPrimary(Request $request, CentralUser $platformUser, TenantMembership $membership, TenantMembershipService $service)
    {
        $this->authorize('setPrimary', $membership);
        abort_unless((int) $membership->central_user_id === (int) $platformUser->id, 404);
        $service->setPrimary($platformUser, $membership);

        return back()->with('success', 'Primary company updated.');
    }

    public function destroy(Request $request, CentralUser $platformUser, TenantMembership $membership, TenantMembershipService $service)
    {
        $this->authorize('revoke', $membership);
        abort_unless((int) $membership->central_user_id === (int) $platformUser->id, 404);
        $reason = $request->validate(['reason' => ['nullable', 'string', 'max:500']])['reason'] ?? null;
        $service->revoke($membership, $reason);

        return back()->with('success', 'Tenant access revoked.');
    }

    public function invite(InvitePlatformUserRequest $request, PlatformInvitationService $invitations)
    {
        abort_unless((bool) $request->user('central')?->can('tenant-memberships.manage'), 403);
        $tenant = Tenant::findOrFail($request->validated('tenant_id'));
        $invitations->invite($tenant, $request->validated('email'), TenantMembershipRole::from($request->validated('role')), $request->permissionOverrides(), $request->user('central'));

        return back()->with('success', 'Invitation sent.');
    }

    public function revokeInvitation(Request $request, CentralUserInvitation $invitation, PlatformInvitationService $invitations)
    {
        abort_unless((bool) $request->user('central')?->can('tenant-memberships.manage'), 403);
        $invitations->revoke($invitation);

        return back()->with('success', 'Invitation revoked.');
    }
}
