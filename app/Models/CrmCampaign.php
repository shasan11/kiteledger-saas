<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmCampaign extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'branch_id',
        'name',
        'code',
        'type',
        'source',
        'medium',
        'description',
        'default_sender_name',
        'default_sender_email',
        'default_reply_to_email',
        'default_sms_sender_id',
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
        'priority',
        'tags',
        'internal_remarks',
        'created_by',
        'updated_by',
        'sent_at',
        'completed_at',
        'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'budget' => 'decimal:2',
            'target_customers' => 'integer',
            'email_only_quantity' => 'integer',
            'sms_only_quantity' => 'integer',
            'rules' => 'array',
            'tags' => 'array',
            'start_date' => 'date',
            'end_date' => 'date',
            'sent_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function getTitleAttribute(): string
    {
        return (string) ($this->attributes['name'] ?? '');
    }

    public function setTitleAttribute(?string $value): void
    {
        $this->attributes['name'] = $value;
    }

    public function contactGroup(): BelongsTo
    {
        return $this->belongsTo(ContactGroup::class);
    }

    public function sendLogs(): HasMany
    {
        return $this->hasMany(CampaignSendLog::class, 'campaign_id');
    }

    public function emailMessages(): HasMany
    {
        return $this->hasMany(CampaignEmailMessage::class, 'campaign_id');
    }

    public function smsMessages(): HasMany
    {
        return $this->hasMany(CampaignSmsMessage::class, 'campaign_id');
    }

    public function emailRecipients(): HasMany
    {
        return $this->hasMany(CampaignEmailRecipient::class, 'campaign_id');
    }

    public function smsRecipients(): HasMany
    {
        return $this->hasMany(CampaignSmsRecipient::class, 'campaign_id');
    }

    public function emailAttachments(): HasMany
    {
        return $this->hasMany(CampaignEmailAttachment::class, 'campaign_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
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
