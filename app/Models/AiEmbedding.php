<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiEmbedding extends Model
{
    protected $fillable = [
        'source_type',
        'source_id',
        'branch_id',
        'content',
        'content_hash',
        'vector',
        'dims',
        'provider',
        'model',
    ];

    protected $casts = [
        'vector' => 'array',
        'dims' => 'integer',
    ];
}
