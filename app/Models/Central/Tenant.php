<?php

namespace App\Models\Central;

use App\Enums\TenantStatus;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;
use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;

class Tenant extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase, HasDomains, SoftDeletes;

    protected $guarded = [];

    protected $hidden = ['database_username', 'database_password', 'data'];

    public static function getCustomColumns(): array
    {
        return ['id', 'company_name', 'legal_name', 'owner_name', 'owner_email', 'owner_phone', 'country', 'address', 'timezone', 'currency', 'status', 'status_reason', 'plan_id', 'default_template_id', 'trial_ends_at', 'subscription_ends_at', 'database_name', 'database_provisioning_mode', 'database_server', 'database_username', 'database_password', 'database_ownership_id', 'provisioned_at', 'created_by', 'created_at', 'updated_at', 'deleted_at'];
    }

    protected function casts(): array
    {
        return ['is_internal' => 'boolean', 'trial_ends_at' => 'datetime', 'subscription_ends_at' => 'datetime', 'provisioned_at' => 'datetime', 'deleted_at' => 'datetime', 'database_username' => 'encrypted', 'database_password' => 'encrypted', 'data' => 'array'];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function subscription(): HasOne
    {
        return $this->hasOne(Subscription::class)->latestOfMany();
    }

    public function provisioningLogs(): HasMany
    {
        return $this->hasMany(ProvisioningLog::class);
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
}
