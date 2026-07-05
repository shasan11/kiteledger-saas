<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiMessage extends Model
{
    use HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'ai_conversation_id', 'role', 'content', 'context',
        'tokens_input', 'tokens_output', 'provider', 'model',
    ];

    protected $casts = [
        'context' => 'array',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(AiConversation::class, 'ai_conversation_id');
    }
}
