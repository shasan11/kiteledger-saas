<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CampaignEmailMessage extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'campaign_id',
        'title',
        'code',
        'subject',
        'preview_text',
        'sender_name',
        'sender_email',
        'reply_to_email',
        'body',
        'template_id',
        'status',
        'send_mode',
        'scheduled_at',
        'timezone',
        'delay_minutes',
        'send_order',
        'is_active',
        'track_opens',
        'track_clicks',
        'priority',
        'notes',
        'sent_at',
        'completed_at',
        'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'delay_minutes' => 'integer',
            'send_order' => 'integer',
            'is_active' => 'boolean',
            'track_opens' => 'boolean',
            'track_clicks' => 'boolean',
            'sent_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(CrmCampaign::class, 'campaign_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(CampaignEmailAttachment::class, 'campaign_email_message_id');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(CampaignEmailRecipient::class, 'campaign_email_message_id');
    }

    public function sendLogs(): HasMany
    {
        return $this->hasMany(CampaignSendLog::class, 'campaign_email_message_id');
    }
}
