<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VariantLine extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'variant_id',
        'value',
        'sort_order',
        'active',
        'is_system_generated',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
        ];
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(Variant::class, 'variant_id', 'id');
    }

    public function productVariantItems(): HasMany
    {
        return $this->hasMany(ProductVariantItem::class, 'variant_line_id', 'id');
    }
}