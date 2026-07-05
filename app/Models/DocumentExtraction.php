<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class DocumentExtraction extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'public_id',
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

    protected $hidden = [
        'id',
        'document_upload_id',
        'raw_text',
        'extracted_json',
        'raw_response',
        'provider_response',
        'prompt',
        'branch_id',
        'fiscal_year_id',
        'company_id',
        'tenant_id',
    ];

    protected function casts(): array
    {
        return [
            'extracted_json' => 'array',
            'normalized_json' => 'array',
            'confidence_score' => 'float',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (DocumentExtraction $extraction): void {
            if (blank($extraction->public_id)) {
                $extraction->public_id = (string) Str::uuid();
            }
        });
    }

    public function documentUpload(): BelongsTo
    {
        return $this->belongsTo(DocumentUpload::class);
    }
}
