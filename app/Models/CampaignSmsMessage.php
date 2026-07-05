<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CampaignSmsMessage extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'campaign_id',
        'title',
        'code',
        'sender_id',
        'sms_config_id',
        'provider_override',
        'body',
        'character_count',
        'segment_count',
        'status',
        'send_mode',
        'scheduled_at',
        'timezone',
        'delay_minutes',
        'send_order',
        'is_active',
        'priority',
        'notes',
        'sent_at',
        'completed_at',
        'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'character_count' => 'integer',
            'segment_count' => 'integer',
            'scheduled_at' => 'datetime',
            'delay_minutes' => 'integer',
            'send_order' => 'integer',
            'is_active' => 'boolean',
            'sent_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(CrmCampaign::class, 'campaign_id');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(CampaignSmsRecipient::class, 'campaign_sms_message_id');
    }

    public function sendLogs(): HasMany
    {
        return $this->hasMany(CampaignSendLog::class, 'campaign_sms_message_id');
    }
}
