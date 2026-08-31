<?php

namespace App\Policies\Platform;

use App\Models\Central\CentralAdmin;
use App\Models\Central\CentralUser;
use App\Models\Central\TenantMembership;
use App\Services\SaaS\TenantAccessService;

class TenantMembershipPolicy
{
    public function __construct(private readonly TenantAccessService $access) {}

    public function viewAny($user): bool
    {
        return $user instanceof CentralAdmin ? $user->can('tenant-memberships.view') : $user instanceof CentralUser;
    }

    public function view($user, TenantMembership $membership): bool
    {
        return $this->manage($user, $membership) || ($user instanceof CentralUser && (int) $membership->central_user_id === (int) $user->id);
    }

    public function manage($user, TenantMembership $membership): bool
    {
        if ($user instanceof CentralAdmin) {
            return $user->can('tenant-memberships.manage');
        }

        return $user instanceof CentralUser && $this->access->canManageUsers($user, $membership->tenant_id);
    }

    public function update($user, TenantMembership $membership): bool
    {
        return $this->manage($user, $membership);
    }

    public function revoke($user, TenantMembership $membership): bool
    {
        return $this->manage($user, $membership);
    }

    public function setPrimary($user, TenantMembership $membership): bool
    {
        return ($user instanceof CentralUser && (int) $membership->central_user_id === (int) $user->id) || $this->manage($user, $membership);
    }
}
