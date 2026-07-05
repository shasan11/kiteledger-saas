<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ReportingTagValue extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'reporting_tag_id',
        'reporting_tag_line_id',
        'taggable_type',
        'taggable_id',
        'value_text',
        'value_number',
        'value_date',
        'value_boolean',
        'value_json',
    ];

    protected function casts(): array
    {
        return [
            'value_number' => 'decimal:6',
            'value_date' => 'date',
            'value_boolean' => 'boolean',
            'value_json' => 'array',
        ];
    }

    public function taggable(): MorphTo
    {
        return $this->morphTo();
    }

    public function reportingTag(): BelongsTo
    {
        return $this->belongsTo(ReportingTag::class);
    }

    public function reportingTagLine(): BelongsTo
    {
        return $this->belongsTo(ReportingTagLine::class);
    }
}
