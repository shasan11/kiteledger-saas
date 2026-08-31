<?php

namespace App\Models\Central;

use App\Enums\TenantMembershipRole;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Maps one platform user to one tenant, with a role plus explicit permission
 * flags. The flags are authoritative: the role only seeds their defaults.
 */
class TenantMembership extends CentralModel
{
    public const PERMISSIONS = TenantMembershipRole::PERMISSIONS;

    protected $table = 'central_user_tenant_memberships';

    protected function casts(): array
    {
        return array_merge(
            collect(self::PERMISSIONS)->mapWithKeys(fn (string $permission): array => [$permission => 'boolean'])->all(),
            [
                'is_active' => 'boolean',
                'is_primary' => 'boolean',
                'invited_at' => 'datetime',
                'accepted_at' => 'datetime',
                'revoked_at' => 'datetime',
                'metadata' => 'array',
                'role' => TenantMembershipRole::class,
            ],
        );
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(CentralUser::class, 'central_user_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)->whereNull('revoked_at');
    }

    public function isUsable(): bool
    {
        return $this->is_active && $this->revoked_at === null;
    }

    public function grants(string $permission): bool
    {
        return in_array($permission, self::PERMISSIONS, true) && $this->isUsable() && (bool) $this->{$permission};
    }

    public function isOwner(): bool
    {
        return $this->role === TenantMembershipRole::Owner;
    }

    /**
     * @return array<string, bool>
     */
    public function permissionMap(): array
    {
        return collect(self::PERMISSIONS)->mapWithKeys(fn (string $permission): array => [$permission => (bool) $this->{$permission}])->all();
    }
}
