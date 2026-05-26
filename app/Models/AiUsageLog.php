<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AiUsageLog extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id', 'branch_id', 'module', 'provider', 'model',
        'prompt_tokens', 'completion_tokens', 'total_tokens',
        'estimated_cost', 'status', 'error_message', 'duration_ms', 'request_hash',
    ];

    protected $casts = [
        'prompt_tokens'      => 'integer',
        'completion_tokens'  => 'integer',
        'total_tokens'       => 'integer',
        'estimated_cost'     => 'float',
        'duration_ms'        => 'integer',
    ];
}
