<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiKnowledgeChunk extends Model
{
    use RequiresTenantConnection;

    protected $fillable = [
        'source_type', 'source_id', 'module', 'title', 'content', 'route',
        'permission', 'keywords', 'metadata', 'branch_id', 'fiscal_year_id',
        'content_hash',
    ];

    protected $casts = [
        'keywords' => 'array',
        'metadata' => 'array',
    ];

    public function embeddings(): HasMany
    {
        return $this->hasMany(AiEmbedding::class, 'knowledge_chunk_id');
    }
}
