<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TaxSystem extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'country_code',
        'name',
        'code',
        'type',
        'description',
        'active',
        'is_system_generated',
        'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'active'              => 'boolean',
            'is_system_generated' => 'boolean',
        ];
    }

    public function taxJurisdictions(): HasMany
    {
        return $this->hasMany(TaxJurisdiction::class);
    }

    public function reportTemplates(): HasMany
    {
        return $this->hasMany(TaxReportTemplate::class);
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_add_id');
    }
}
