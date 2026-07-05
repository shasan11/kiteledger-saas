<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiPendingAction extends Model
{
    use HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'ai_conversation_id',
        'user_id',
        'branch_id',
        'action_type',
        'module',
        'target_type',
        'target_id',
        'title',
        'summary',
        'payload',
        'risk_level',
        'risk_reasons',
        'status',
        'approved_by',
        'approved_at',
        'executed_at',
        'error_message',
        'metadata',
    ];

    protected $casts = [
        'payload' => 'array',
        'risk_reasons' => 'array',
        'metadata' => 'array',
        'approved_at' => 'datetime',
        'executed_at' => 'datetime',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(AiConversation::class, 'ai_conversation_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }
}
