<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Immutable audit record of an AI action that was executed, rejected, or failed.
 * Stores before/after snapshots so AI-driven changes are fully traceable.
 */
class AiActionAuditLog extends Model
{
    use HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'ai_pending_action_id',
        'user_id',
        'action_type',
        'module',
        'target_type',
        'target_id',
        'before_values',
        'after_values',
        'status',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'before_values' => 'array',
        'after_values' => 'array',
    ];

    public function pendingAction(): BelongsTo
    {
        return $this->belongsTo(AiPendingAction::class, 'ai_pending_action_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
