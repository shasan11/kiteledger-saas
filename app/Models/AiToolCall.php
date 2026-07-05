<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ledger of deterministic ERP tool invocations performed while answering an AI
 * chat message (e.g. journal_voucher.cash_balance, receivable.total). Provides
 * traceability for the "exact numbers come from backend tools" guarantee.
 */
class AiToolCall extends Model
{
    use HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'ai_conversation_id',
        'ai_message_id',
        'user_id',
        'tool_name',
        'input',
        'output',
        'status',
        'error_message',
        'duration_ms',
    ];

    protected $casts = [
        'input' => 'array',
        'output' => 'array',
        'duration_ms' => 'integer',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(AiConversation::class, 'ai_conversation_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
