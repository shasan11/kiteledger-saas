<?php

namespace App\Models\Central;

use App\Enums\PlatformUserStatus;
use App\Enums\TenantMembershipRole;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

/**
 * A KiteLedger platform (customer) account. One human, one global identity,
 * many tenants. Lives exclusively on the central connection.
 *
 * This is NOT App\Models\User (tenant-local staff) and NOT
 * App\Models\Central\CentralAdmin (internal KiteLedger operators).
 */
class CentralUser extends Authenticatable
{
    use CentralConnection, SoftDeletes;

    protected $table = 'central_users';

    protected $fillable = [
        'uuid', 'name', 'first_name', 'last_name', 'email', 'email_verified_at', 'phone',
        'password', 'avatar', 'locale', 'timezone', 'country', 'status', 'is_active',
        'force_password_reset', 'password_changed_at', 'sessions_invalidated_at',
        'last_login_at', 'last_login_ip', 'last_active_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    /** @var array<string, \App\Models\Central\TenantMembership|null> */
    protected array $membershipCache = [];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'email_verified_at' => 'datetime',
            'password_changed_at' => 'datetime',
            'sessions_invalidated_at' => 'datetime',
            'last_login_at' => 'datetime',
            'last_active_at' => 'datetime',
            'is_active' => 'boolean',
            'force_password_reset' => 'boolean',
            'status' => PlatformUserStatus::class,
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $user): void {
            $user->uuid ??= (string) Str::uuid();
            $user->name = $user->name ?: trim($user->first_name.' '.$user->last_name);
        });
    }

    public function profile(): HasOne
    {
        return $this->hasOne(CentralUserProfile::class, 'central_user_id');
    }

    public function tenantMemberships(): HasMany
    {
        return $this->hasMany(TenantMembership::class, 'central_user_id');
    }

    /** Alias kept short for controller/service readability. */
    public function memberships(): HasMany
    {
        return $this->tenantMemberships();
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(CentralUserInvitation::class, 'email', 'email');
    }

    public function tenants(): BelongsToMany
    {
        return $this->belongsToMany(Tenant::class, 'central_user_tenant_memberships', 'central_user_id', 'tenant_id')
            ->withPivot(array_merge(['id', 'role', 'is_active', 'is_primary', 'accepted_at', 'revoked_at'], TenantMembershipRole::PERMISSIONS))
            ->withTimestamps();
    }

    /** Tenants this user may actually open right now. */
    public function accessibleTenants(): BelongsToMany
    {
        return $this->tenants()->wherePivot('is_active', true)->wherePivot('can_access_tenant', true)->whereNull('central_user_tenant_memberships.revoked_at');
    }

    public function ownedTenants(): BelongsToMany
    {
        return $this->tenants()->wherePivot('is_active', true)->wherePivot('role', TenantMembershipRole::Owner->value);
    }

    public function primaryMembership(): HasOne
    {
        return $this->hasOne(TenantMembership::class, 'central_user_id')->where('is_primary', true)->where('is_active', true);
    }

    public function membershipFor(Tenant|string|null $tenant): ?TenantMembership
    {
        $tenantId = $tenant instanceof Tenant ? $tenant->getKey() : $tenant;
        if (blank($tenantId)) {
            return null;
        }
        if (! array_key_exists($tenantId, $this->membershipCache)) {
            $loaded = $this->relationLoaded('tenantMemberships')
                ? $this->tenantMemberships->firstWhere('tenant_id', $tenantId)
                : $this->tenantMemberships()->where('tenant_id', $tenantId)->first();
            $this->membershipCache[$tenantId] = $loaded;
        }

        return $this->membershipCache[$tenantId];
    }

    public function forgetMembershipCache(): void
    {
        $this->membershipCache = [];
    }

    public function isPlatformActive(): bool
    {
        return $this->is_active && $this->status === PlatformUserStatus::Active && ! $this->trashed();
    }

    public function canAccessTenant(Tenant|string|null $tenant): bool
    {
        return $this->isPlatformActive() && (bool) $this->membershipFor($tenant)?->grants('can_access_tenant');
    }

    public function hasTenantPermission(Tenant|string|null $tenant, string $permission): bool
    {
        return $this->isPlatformActive() && (bool) $this->membershipFor($tenant)?->grants($permission);
    }

    public function canManageTenantUsers(Tenant|string|null $tenant): bool
    {
        return $this->hasTenantPermission($tenant, 'can_manage_users');
    }

    public function canManageTenantBilling(Tenant|string|null $tenant): bool
    {
        return $this->hasTenantPermission($tenant, 'can_manage_billing');
    }

    public function canManageTenantPlan(Tenant|string|null $tenant): bool
    {
        return $this->hasTenantPermission($tenant, 'can_manage_plan');
    }

    public function canViewTenantInvoices(Tenant|string|null $tenant): bool
    {
        return $this->hasTenantPermission($tenant, 'can_view_invoices');
    }

    public function canMakeTenantPayments(Tenant|string|null $tenant): bool
    {
        return $this->hasTenantPermission($tenant, 'can_make_payments');
    }

    public function canManageTenantCompany(Tenant|string|null $tenant): bool
    {
        return $this->hasTenantPermission($tenant, 'can_manage_company');
    }

    /**
     * Invited accounts have no password until they accept. Returning an empty
     * string keeps the hasher's constant-time rejection path intact.
     */
    public function getAuthPassword(): string
    {
        return (string) $this->password;
    }

    public function displayName(): string
    {
        return $this->name ?: trim($this->first_name.' '.$this->last_name) ?: $this->email;
    }

    public function sendPasswordResetNotification($token): void
    {
        $url = route('central.account.password.reset', ['token' => $token, 'email' => $this->email]);
        Mail::html(
            '<p>A password reset was requested for your KiteLedger account.</p><p><a href="'.e($url).'">Reset your password</a></p><p>This link expires in 60 minutes. If you did not request it, no action is required.</p>',
            fn ($message) => $message->to($this->email)->subject('Reset your KiteLedger password'),
        );
    }
}
