<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DocumentUpload extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'label',
        'original_file_name',
        'file_path',
        'mime_type',
        'file_size',
        'file_hash',
        'document_type',
        'status',
        'branch_id',
        'fiscal_year_id',
        'uploaded_by',
        'notes',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'uploaded_by' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function extraction(): HasOne
    {
        return $this->hasOne(DocumentExtraction::class)->latestOfMany();
    }

    public function extractions(): HasMany
    {
        return $this->hasMany(DocumentExtraction::class);
    }

    public function entityMatches(): HasMany
    {
        return $this->hasMany(DocumentEntityMatch::class);
    }

    public function proposals(): HasMany
    {
        return $this->hasMany(DocumentTransactionProposal::class);
    }

    public function links(): HasMany
    {
        return $this->hasMany(DocumentLink::class);
    }
}
