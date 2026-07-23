<?php

namespace App\Models;

use App\Enums\TenantStatus;
use App\Models\Central\Plan;
use App\Models\Central\ProvisioningLog;
use App\Models\Central\Subscription;
use App\Models\Central\TenantFeatureOverride;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;
use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;

class Tenant extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase, HasDomains, SoftDeletes;

    protected $guarded = [];

    protected $hidden = ['tenancy_db_password', 'database_password', 'database_username', 'data'];

    public static function getCustomColumns(): array
    {
        return [
            'id', 'company_name', 'slug', 'status', 'plan_id', 'provisioning_step',
            'last_provisioning_error', 'provisioned_at', 'suspended_at', 'deleted_at',
            'tenancy_db_connection', 'tenancy_db_name', 'tenancy_db_host',
            'tenancy_db_port', 'tenancy_db_username', 'tenancy_db_password',
            'database_created_by_app', 'data',
            // Retained central columns keep existing marketplace installs and
            // the central admin UI compatible during rolling upgrades.
            'legal_name', 'owner_name', 'owner_email', 'owner_phone', 'country',
            'address', 'timezone', 'currency', 'status_reason', 'default_template_id',
            'trial_ends_at', 'subscription_ends_at', 'database_name',
            'database_provisioning_mode', 'database_server', 'database_username',
            'database_password', 'database_ownership_id', 'created_by', 'created_at',
            'updated_at', 'is_internal', 'lifecycle_version',
        ];
    }

    protected function casts(): array
    {
        return [
            'status' => TenantStatus::class,
            'provisioned_at' => 'datetime',
            'suspended_at' => 'datetime',
            'deleted_at' => 'datetime',
            'tenancy_db_password' => 'encrypted',
            'database_created_by_app' => 'boolean',
            'data' => 'array',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function featureOverrides(): HasMany
    {
        return $this->hasMany(TenantFeatureOverride::class);
    }

    public function provisioningLogs(): HasMany
    {
        return $this->hasMany(ProvisioningLog::class);
    }

    public function isActive(): bool
    {
        return $this->status === TenantStatus::Active;
    }

    public function isOperational(): bool
    {
        return $this->isActive();
    }
}
