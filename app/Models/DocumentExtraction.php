<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentExtraction extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'document_upload_id',
        'provider',
        'model',
        'raw_text',
        'extracted_json',
        'normalized_json',
        'confidence_score',
        'status',
        'error_message',
        'started_at',
        'completed_at',
    ];

    /**
     * Raw provider text can contain full document contents and should not be returned by default.
     */
    protected $hidden = [
        'document_upload_id',
        'raw_text',
        'extracted_json',
    ];

    protected function casts(): array
    {
        return [
            'extracted_json' => 'array',
            'normalized_json' => 'array',
            'confidence_score' => 'float',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function documentUpload(): BelongsTo
    {
        return $this->belongsTo(DocumentUpload::class);
    }
}
