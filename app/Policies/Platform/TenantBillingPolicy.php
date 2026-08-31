<?php

namespace App\Policies\Platform;

use App\Models\Central\CentralUser;
use App\Models\Central\Tenant;
use App\Services\SaaS\TenantAccessService;

/**
 * Billing abilities are registered as standalone gates (`tenant-billing.*`)
 * so subscription, invoice and payment permissions stay independently
 * enforceable from the general tenant abilities.
 */
class TenantBillingPolicy
{
    public function __construct(private readonly TenantAccessService $access) {}

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
