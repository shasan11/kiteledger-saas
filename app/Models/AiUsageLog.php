<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AiUsageLog extends Model
{
    use HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'user_id', 'branch_id', 'module', 'provider', 'model',
        'prompt_tokens', 'completion_tokens', 'total_tokens',
        'estimated_cost', 'status', 'error_message', 'duration_ms', 'request_hash',
        'question', 'intent', 'selected_tool', 'filters', 'date_range', 'row_count', 'token_estimate',
    ];

    protected $casts = [
        'prompt_tokens' => 'integer',
        'completion_tokens' => 'integer',
        'total_tokens' => 'integer',
        'estimated_cost' => 'float',
        'duration_ms' => 'integer',
        'filters' => 'array',
        'date_range' => 'array',
        'row_count' => 'integer',
        'token_estimate' => 'integer',
    ];
}
