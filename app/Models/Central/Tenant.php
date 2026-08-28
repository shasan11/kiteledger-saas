<?php

namespace App\Models\Central;

use App\Enums\TenantMembershipRole;
use App\Enums\TenantStatus;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Backwards-compatible namespace for the central admin module.
 * Stancl resolves App\Models\Tenant directly.
 */
class Tenant extends \App\Models\Tenant
{
    public function domains(): HasMany
    {
        return $this->hasMany(Domain::class, 'tenant_id', $this->getTenantKeyName());
    }

    public static function getCustomColumns(): array
    {
        return array_values(array_unique(array_merge(parent::getCustomColumns(), [
            'legal_name', 'owner_name', 'owner_email', 'owner_phone', 'country',
            'address', 'timezone', 'currency', 'status_reason', 'default_template_id',
            'trial_ends_at', 'subscription_ends_at', 'database_name',
            'database_provisioning_mode', 'database_server', 'database_username',
            'database_password', 'database_ownership_id', 'created_by', 'created_at',
            'updated_at', 'is_internal', 'lifecycle_version',
        ])));
    }

    protected function casts(): array
    {
        return array_merge(parent::casts(), [
            // Legacy central services compare string status values. Tenant requests
            // resolved by Stancl use App\Models\Tenant and receive the enum cast.
            'status' => 'string',
            'is_internal' => 'boolean',
            'trial_ends_at' => 'datetime',
            'subscription_ends_at' => 'datetime',
            'database_username' => 'encrypted',
            'database_password' => 'encrypted',
        ]);
    }

    public function provisioningLogs(): HasMany
    {
        return $this->hasMany(ProvisioningLog::class);
    }

    public function deletionRequests(): HasMany
    {
        return $this->hasMany(TenantDeletionRequest::class);
    }

    public function usageMetrics(): HasMany
    {
        return $this->hasMany(TenantUsageMetric::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(TenantInvoice::class);
    }

    public function isOperational(): bool
    {
        return $this->status === TenantStatus::Active->value;
    }

    /** Platform-user access records. Cross-tenant mapping lives centrally. */
    public function memberships(): HasMany
    {
        return $this->hasMany(TenantMembership::class, 'tenant_id', $this->getTenantKeyName());
    }

    public function platformUsers(): BelongsToMany
    {
        return $this->belongsToMany(CentralUser::class, 'central_user_tenant_memberships', 'tenant_id', 'central_user_id')
            ->withPivot(array_merge(['id', 'role', 'is_active', 'is_primary', 'accepted_at', 'revoked_at'], TenantMembershipRole::PERMISSIONS))
            ->withTimestamps();
    }

    public function owners(): BelongsToMany
    {
        return $this->platformUsers()->wherePivot('is_active', true)->wherePivot('role', TenantMembershipRole::Owner->value);
    }

    public function billingManagers(): BelongsToMany
    {
        return $this->platformUsers()->wherePivot('is_active', true)->wherePivot('can_manage_billing', true);
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(CentralUserInvitation::class, 'tenant_id', $this->getTenantKeyName());
    }
}
