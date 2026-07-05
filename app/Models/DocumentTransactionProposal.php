<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentTransactionProposal extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'document_upload_id',
        'document_extraction_id',
        'transaction_type',
        'status',
        'payload',
        'missing_fields',
        'warnings',
        'confidence_score',
        'created_record_type',
        'created_record_id',
        'created_by',
        'approved_by',
        'approved_at',
        'converted_at',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'missing_fields' => 'array',
            'warnings' => 'array',
            'confidence_score' => 'float',
            'created_by' => 'integer',
            'approved_by' => 'integer',
            'approved_at' => 'datetime',
            'converted_at' => 'datetime',
        ];
    }

    public function documentUpload(): BelongsTo
    {
        return $this->belongsTo(DocumentUpload::class);
    }
}
