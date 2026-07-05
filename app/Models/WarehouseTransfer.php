<?php

namespace App\Models;

use App\Models\Concerns\HasFiscalYear;
use App\Models\Concerns\HasReportingTags;
use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WarehouseTransfer extends Model
{
    use HasFactory, HasFiscalYear, HasReportingTags, HasUuids;
    use RequiresTenantConnection;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'branch_id',
        'fiscal_year_id',
        'transfer_no',
        'transfer_date',
        'from_warehouse_id',
        'to_warehouse_id',
        'notes',
        'remarks',
        'status',
        'active',
        'approved',
        'approved_at',
        'approved_by_id',
        'stock_posted',
        'stock_posted_at',
        'void',
        'voided_by_id',
        'voided_reason',
        'voided_at',
        'exchange_rate',
        'total',
        'user_add_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'transfer_date' => 'date',
            'active' => 'boolean',
            'approved' => 'boolean',
            'approved_at' => 'datetime',
            'approved_by_id' => 'integer',
            'stock_posted' => 'boolean',
            'stock_posted_at' => 'datetime',
            'void' => 'boolean',
            'voided_by_id' => 'integer',
            'voided_at' => 'datetime',
            'exchange_rate' => 'decimal:6',
            'total' => 'decimal:6',
            'user_add_id' => 'integer',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function fromWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function toWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function voidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function warehouseTransferLines(): HasMany
    {
        return $this->hasMany(WarehouseTransferLine::class);
    }
}
