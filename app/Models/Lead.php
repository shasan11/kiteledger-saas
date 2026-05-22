<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\DealPipeline;

class Lead extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'lead_no',
        'contact_id',
        'crm_account_id',
        'deal_pipeline_id',
        'campaign_id',
        'assigned_to_id',
        'converted_contact_id',
        'converted_deal_id',
        'name',
        'company_name',
        'email',
        'phone',
        'mobile',
        'website',
        'address',
        'city',
        'state',
        'country',
        'lead_source',
        'industry',
        'expected_value',
        'status',
        'lost_reason',
        'priority',
        'next_follow_up_date',
        'next_follow_up_at',
        'last_contacted_at',
        'notes',
        'converted_at',
        'active',
        'is_system_generated',
        'user_add_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'assigned_to_id' => 'integer',
            'expected_value' => 'decimal:2',
            'next_follow_up_date' => 'datetime',
            'next_follow_up_at' => 'datetime',
            'last_contacted_at' => 'datetime',
            'converted_at' => 'datetime',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function dealPipeline(): BelongsTo
    {
        return $this->belongsTo(DealPipeline::class, 'deal_pipeline_id');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function convertedContact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function convertedDeal(): BelongsTo
    {
        return $this->belongsTo(Deal::class);
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class);
    }

    public function crmActivities(): HasMany
    {
        return $this->hasMany(CrmActivity::class);
    }

    public function crmCommunications(): HasMany
    {
        return $this->hasMany(CrmCommunication::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(CrmCampaign::class, 'campaign_id');
    }

    public function purchaseBills(): HasMany
    {
        return $this->hasMany(PurchaseBill::class);
    }

    public function supportTickets(): HasMany
    {
        return $this->hasMany(SupportTicket::class);
    }
}
