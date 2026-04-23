<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryAdjustment extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'branch_id',
        'adjustment_no',
        'adjustment_date',
        'warehouse_id',
        'reason',
        'notes',
        'status',
        'user_add_id',
        'active',
        'approved',
        'voided',
        'voided_reason',
        'voided_date',
        'voided_by_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'adjustment_date' => 'date',
            'user_add_id' => 'integer',
            'active' => 'boolean',
            'approved' => 'boolean',
            'voided' => 'boolean',
            'voided_date' => 'date',
            'voided_by_id' => 'integer',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function voidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function inventoryAdjustmentLines(): HasMany
    {
        return $this->hasMany(InventoryAdjustmentLine::class);
    }
}
