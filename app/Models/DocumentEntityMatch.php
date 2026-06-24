<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentEntityMatch extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'document_upload_id',
        'document_extraction_id',
        'entity_type',
        'extracted_name',
        'matched_model',
        'matched_id',
        'match_status',
        'confidence_score',
        'options',
        'created_record_id',
    ];

    protected $hidden = [
        'document_upload_id',
        'document_extraction_id',
        'matched_model',
        'created_record_id',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'confidence_score' => 'float',
        ];
    }

    public function documentUpload(): BelongsTo
    {
        return $this->belongsTo(DocumentUpload::class);
    }
}
