<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmCampaign extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'branch_id',
        'name',
        'code',
        'source',
        'medium',
        'description',
        'budget',
        'target_customers',
        'email_only_quantity',
        'sms_only_quantity',
        'contact_group_id',
        'email_subject',
        'email_preview_text',
        'email_body',
        'sms_body',
        'rules',
        'start_date',
        'end_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'budget' => 'decimal:2',
            'target_customers' => 'integer',
            'email_only_quantity' => 'integer',
            'sms_only_quantity' => 'integer',
            'rules' => 'array',
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    public function contactGroup(): BelongsTo
    {
        return $this->belongsTo(ContactGroup::class);
    }

    public function sendLogs(): HasMany
    {
        return $this->hasMany(CampaignSendLog::class, 'campaign_id');
    }

    public function attributions(): HasMany
    {
        return $this->hasMany(CrmAttribution::class, 'campaign_id');
    }

    public function purchaseBills(): HasMany
    {
        return $this->hasMany(PurchaseBill::class, 'campaign_id');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class, 'campaign_id');
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class, 'campaign_id');
    }

    public function supportTickets(): HasMany
    {
        return $this->hasMany(SupportTicket::class, 'campaign_id');
    }
}
