<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportTicketComment extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    public const TYPES = [
        'public_reply',
        'internal_note',
        'status_change',
        'assignment_change',
    ];

    protected $fillable = [
        'support_ticket_id',
        'user_id',
        'type',
        'body',
        'attachments',
        'is_internal',
    ];

    protected function casts(): array
    {
        return [
            'attachments' => 'array',
            'is_internal' => 'boolean',
            'user_id' => 'integer',
        ];
    }

    public function supportTicket(): BelongsTo
    {
        return $this->belongsTo(SupportTicket::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
