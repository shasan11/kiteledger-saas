<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CampaignSendLog extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    public const CHANNEL_EMAIL = 'email';

    public const CHANNEL_SMS = 'sms';

    public const STATUS_PENDING = 'pending';

    public const STATUS_QUEUED = 'queued';

    public const STATUS_SENT = 'sent';

    public const STATUS_DELIVERED = 'delivered';

    public const STATUS_FAILED = 'failed';

    public const STATUS_BOUNCED = 'bounced';

    public const STATUS_OPENED = 'opened';

    public const STATUS_CLICKED = 'clicked';

    public const STATUS_UNSUBSCRIBED = 'unsubscribed';

    public const STATUS_SKIPPED = 'skipped';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'campaign_id',
        'campaign_email_message_id',
        'campaign_sms_message_id',
        'campaign_email_recipient_id',
        'campaign_sms_recipient_id',
        'sms_log_id',
        'contact_id',
        'contact_group_id',
        'channel',
        'type',
        'message_title',
        'recipient_name',
        'company_name',
        'email',
        'phone',
        'to_address',
        'provider',
        'status',
        'provider_message_id',
        'external_message_id',
        'error_code',
        'error_message',
        'error',
        'provider_response',
        'metadata',
        'queued_at',
        'sent_at',
        'delivered_at',
        'opened_at',
        'clicked_at',
        'failed_at',
        'bounced_at',
        'skipped_at',
        'resolved_at',
        'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'provider_response' => 'array',
            'metadata' => 'array',
            'queued_at' => 'datetime',
            'sent_at' => 'datetime',
            'delivered_at' => 'datetime',
            'opened_at' => 'datetime',
            'clicked_at' => 'datetime',
            'failed_at' => 'datetime',
            'bounced_at' => 'datetime',
            'skipped_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(CrmCampaign::class, 'campaign_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function contactGroup(): BelongsTo
    {
        return $this->belongsTo(ContactGroup::class);
    }

    public function emailMessage(): BelongsTo
    {
        return $this->belongsTo(CampaignEmailMessage::class, 'campaign_email_message_id');
    }

    public function smsMessage(): BelongsTo
    {
        return $this->belongsTo(CampaignSmsMessage::class, 'campaign_sms_message_id');
    }

    public function emailRecipient(): BelongsTo
    {
        return $this->belongsTo(CampaignEmailRecipient::class, 'campaign_email_recipient_id');
    }

    public function smsRecipient(): BelongsTo
    {
        return $this->belongsTo(CampaignSmsRecipient::class, 'campaign_sms_recipient_id');
    }

    public function smsLog(): BelongsTo
    {
        return $this->belongsTo(SmsLog::class, 'sms_log_id');
    }
}
