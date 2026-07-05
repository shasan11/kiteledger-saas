<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class DocumentUpload extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'public_id',
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

    protected $hidden = [
        'id',
        'file_path',
        'file_hash',
        'uploaded_by',
        'branch_id',
        'fiscal_year_id',
        'company_id',
        'tenant_id',
        'deleted_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'uploaded_by' => 'integer',
            'metadata' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (DocumentUpload $document): void {
            if (blank($document->public_id)) {
                $document->public_id = (string) Str::uuid();
            }
        });
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
