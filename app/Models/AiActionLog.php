<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AiActionLog extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id', 'branch_id', 'module', 'action_type',
        'target_type', 'target_id', 'request_payload', 'response_payload',
        'risk_level', 'status',
    ];

    protected $casts = [
        'request_payload'  => 'array',
        'response_payload' => 'array',
    ];
}
