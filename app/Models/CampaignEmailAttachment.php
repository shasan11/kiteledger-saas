<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CampaignEmailAttachment extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'campaign_id',
        'campaign_email_message_id',
        'original_name',
        'file_name',
        'file_path',
        'file_type',
        'mime_type',
        'file_size',
        'uploaded_by',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'is_active' => 'boolean',
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

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
