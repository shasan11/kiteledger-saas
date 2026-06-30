<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiKnowledgeChunk extends Model
{
    protected $fillable = [
        'source_type', 'source_id', 'module', 'title', 'content', 'route',
        'permission', 'keywords', 'metadata', 'branch_id', 'fiscal_year_id',
        'content_hash',
    ];

    protected $casts = [
        'keywords' => 'array',
        'metadata' => 'array',
    ];
}
