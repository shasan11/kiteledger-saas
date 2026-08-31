<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Model;

class AiEmbedding extends Model
{
    use RequiresTenantConnection;

    protected $fillable = [
        'source_type',
        'source_id',
        'knowledge_chunk_id',
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

    public function knowledgeChunk()
    {
        return $this->belongsTo(AiKnowledgeChunk::class, 'knowledge_chunk_id');
    }
}
