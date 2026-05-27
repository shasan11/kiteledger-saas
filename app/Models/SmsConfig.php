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

    protected $fillable = [
        'branch_id',
        'name',
        'provider',
        'account_sid',
        'auth_token',
        'from_number',
        'api_key',
        'base_url',
        'sender_id',
        'active',
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
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'is_default' => 'boolean',
            'is_system_generated' => 'boolean',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
