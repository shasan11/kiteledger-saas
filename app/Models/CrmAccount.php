<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmAccount extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'branch_id',
        'account_no',
        'name',
        'legal_name',
        'industry',
        'website',
        'phone',
        'email',
        'billing_address',
        'shipping_address',
        'parent_account_id',
        'owner_id',
        'status',
        'segment',
        'source',
        'annual_revenue',
        'employee_count',
        'credit_limit',
        'active',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'annual_revenue' => 'decimal:2',
            'employee_count' => 'integer',
            'credit_limit' => 'decimal:2',
            'active' => 'boolean',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function parentAccount(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_account_id');
    }

    public function childAccounts(): HasMany
    {
        return $this->hasMany(self::class, 'parent_account_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class, 'crm_account_id');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class, 'crm_account_id');
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class, 'crm_account_id');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(CrmActivity::class, 'crm_account_id');
    }

    public function communications(): HasMany
    {
        return $this->hasMany(CrmCommunication::class, 'account_id');
    }

    public function contactRoles(): HasMany
    {
        return $this->hasMany(CrmContactRole::class, 'account_id');
    }

    public function healthScores(): HasMany
    {
        return $this->hasMany(CrmCustomerHealthScore::class, 'account_id');
    }
}
