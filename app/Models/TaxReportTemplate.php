<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaxReportTemplate extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'country_code',
        'tax_system_id',
        'report_key',
        'report_name',
        'description',
        'columns_json',
        'mapping_json',
        'active',
        'is_system_generated',
    ];

    protected function casts(): array
    {
        return [
            'columns_json' => 'array',
            'mapping_json' => 'array',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
        ];
    }

    public function taxSystem(): BelongsTo
    {
        return $this->belongsTo(TaxSystem::class);
    }
}
