<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmsLog extends Model
{
    use HasFactory, HasUuids;

    public const STATUSES = ['pending', 'queued', 'sent', 'delivered', 'failed', 'bounced', 'skipped', 'cancelled'];

    protected $fillable = [
        'sms_config_id',
        'sms_template_id',
        'campaign_id',
        'campaign_sms_message_id',
        'campaign_sms_recipient_id',
        'module',
        'module_id',
        'recipient_name',
        'phone',
        'normalized_phone',
        'sender_id',
        'provider',
        'message',
        'message_length',
        'segment_count',
        'status',
        'provider_message_id',
        'provider_response',
        'error_code',
        'error_message',
        'queued_at',
        'sent_at',
        'delivered_at',
        'failed_at',
        'bounced_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'provider_response' => 'array',
            'message_length' => 'integer',
            'segment_count' => 'integer',
            'queued_at' => 'datetime',
            'sent_at' => 'datetime',
            'delivered_at' => 'datetime',
            'failed_at' => 'datetime',
            'bounced_at' => 'datetime',
        ];
    }

    public function config(): BelongsTo
    {
        return $this->belongsTo(SmsConfig::class, 'sms_config_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(SmsTemplate::class, 'sms_template_id');
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(CrmCampaign::class, 'campaign_id');
    }
}
