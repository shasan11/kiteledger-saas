<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AiRiskReview extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id', 'module', 'target_type', 'target_id',
        'risk_level', 'score', 'reasons', 'recommendations', 'checked_payload',
    ];

    protected $casts = [
        'reasons'         => 'array',
        'recommendations' => 'array',
        'checked_payload' => 'array',
        'score'           => 'integer',
    ];
}
