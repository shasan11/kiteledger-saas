<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CampaignEmailRecipient extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'campaign_id',
        'campaign_email_message_id',
        'contact_id',
        'contact_group_id',
        'name',
        'company_name',
        'email',
        'phone',
        'source',
        'is_valid_email',
        'is_unsubscribed',
        'status',
        'scheduled_at',
        'sent_at',
        'last_log_status',
    ];

    protected function casts(): array
    {
        return [
            'is_valid_email' => 'boolean',
            'is_unsubscribed' => 'boolean',
            'scheduled_at' => 'datetime',
            'sent_at' => 'datetime',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(CrmCampaign::class, 'campaign_id');
    }

    public function emailMessage(): BelongsTo
    {
        return $this->belongsTo(CampaignEmailMessage::class, 'campaign_email_message_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function contactGroup(): BelongsTo
    {
        return $this->belongsTo(ContactGroup::class);
    }

    public function sendLogs(): HasMany
    {
        return $this->hasMany(CampaignSendLog::class, 'campaign_email_recipient_id');
    }
}
