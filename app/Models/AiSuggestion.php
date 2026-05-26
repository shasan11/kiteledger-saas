<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AiSuggestion extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id', 'branch_id', 'module', 'suggestion_type',
        'target_type', 'target_id', 'title', 'summary', 'payload',
        'status', 'accepted_at', 'rejected_at',
    ];

    protected $casts = [
        'payload'     => 'array',
        'accepted_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];
}
