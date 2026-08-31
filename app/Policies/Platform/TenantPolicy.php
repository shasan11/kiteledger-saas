<?php

namespace App\Policies\Platform;

use App\Models\Central\CentralUser;
use App\Models\Central\Tenant;
use App\Services\SaaS\TenantAccessService;

/**
 * Platform-user abilities against one tenant. Central administrators are
 * authorised through their own CentralRole permissions, not this policy.
 */
class TenantPolicy
{
    public function __construct(private readonly TenantAccessService $access) {}

    public function viewTenant($user, Tenant $tenant): bool
    {
        return $user instanceof CentralUser && $this->access->canAccessTenant($user, $tenant);
    }

    public function manageTenant($user, Tenant $tenant): bool
    {
        return $user instanceof CentralUser && $this->access->canManageCompany($user, $tenant);
    }

    public function manageUsers($user, Tenant $tenant): bool
    {
        return $user instanceof CentralUser && $this->access->canManageUsers($user, $tenant);
    }

    public function manageMemberships($user, Tenant $tenant): bool
    {
        return $this->manageUsers($user, $tenant);
    }

    public function manageIntegrations($user, Tenant $tenant): bool
    {
        return $user instanceof CentralUser && $this->access->canManageIntegrations($user, $tenant);
    }

    public function manageBilling($user, Tenant $tenant): bool
    {
        return $user instanceof CentralUser && $this->access->canManageBilling($user, $tenant);
    }

    public function managePlan($user, Tenant $tenant): bool
    {
        return $user instanceof CentralUser && $this->access->canManagePlan($user, $tenant);
    }

    public function viewInvoices($user, Tenant $tenant): bool
    {
        return $user instanceof CentralUser && $this->access->canViewInvoices($user, $tenant);
    }

    public function makePayment($user, Tenant $tenant): bool
    {
        return $user instanceof CentralUser && $this->access->canMakePayments($user, $tenant);
    }
}
