<?php

namespace App\Models\Central;

use App\Enums\TenantMembershipRole;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A pending invitation to join a tenant as a platform user. Only the SHA-256
 * hash of the token is stored; the raw token exists solely in the emailed link.
 */
class CentralUserInvitation extends CentralModel
{
    protected $table = 'central_user_invitations';

    protected $hidden = ['token_hash'];

    protected function casts(): array
    {
        return ['permissions' => 'array', 'expires_at' => 'datetime', 'accepted_at' => 'datetime', 'revoked_at' => 'datetime', 'role' => TenantMembershipRole::class];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->whereNull('accepted_at')->whereNull('revoked_at')->where('expires_at', '>', now());
    }

    public function status(): string
    {
        return match (true) {
            $this->accepted_at !== null => 'active',
            $this->revoked_at !== null => 'revoked',
            $this->expires_at?->isPast() === true => 'expired',
            default => 'invited',
        };
    }
}
