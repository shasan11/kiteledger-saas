<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmsConfig extends Model
{
    use HasFactory, HasUuids;

    public const PROVIDER_TWILIO = 'twilio';
    public const PROVIDER_INFOBIP = 'infobip';
    public const PROVIDER_SPARROW = 'sparrow_sms';
    public const PROVIDER_SMS_GLOBAL = 'sms_global';
    public const PROVIDER_MESSAGE_BIRD = 'message_bird';
    public const PROVIDER_VONAGE = 'vonage';
    public const PROVIDER_CUSTOM_HTTP = 'custom_http';
    public const PROVIDER_CUSTOM_POST = 'custom_post';
    public const PROVIDER_CUSTOM_GET = 'custom_get';

    protected $fillable = [
        'branch_id',
        'name',
        'provider',
        'sender_id',
        'api_base_url',
        'api_secret',
        'username',
        'password',
        'route',
        'country_code',
        'default_country_code',
        'webhook_url',
        'callback_url',
        'test_phone',
        'test_message',
        'metadata',
        'created_by',
        'updated_by',
        'account_sid',
        'auth_token',
        'from_number',
        'api_key',
        'base_url',
        'active',
        'is_active',
        'is_default',
        'is_system_generated',
        'user_add_id',
    ];

    protected $hidden = [
        // Secrets are not exposed via standard serialization. The controller
        // returns a masked representation via mutateSerializedRecord so the
        // user can confirm a value exists without leaking it back to the
        // frontend after save.
        'auth_token',
        'api_key',
        'api_secret',
        'password',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
            'is_system_generated' => 'boolean',
            'metadata' => 'array',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function getApiBaseUrlAttribute($value): ?string
    {
        return $value ?: $this->attributes['base_url'] ?? null;
    }

    public function getIsActiveAttribute($value): bool
    {
        return (bool) ($value ?? $this->attributes['active'] ?? true);
    }
}
