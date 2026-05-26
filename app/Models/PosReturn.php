<?php

namespace App\Models;

use App\Models\Concerns\HasFiscalYear;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PosReturn extends Model
{
    use HasFactory, HasFiscalYear, HasUuids;

    protected $fillable = [
        'branch_id',
        'fiscal_year_id',
        'pos_sale_id',
        'sales_return_id',
        'pos_shift_id',
        'return_no',
        'return_date',
        'refund_amount',
        'refund_method',
        'reason',
        'notes',
        'status',
        'approved',
        'approved_at',
        'approved_by_id',
        'active',
        'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'return_date' => 'datetime',
            'refund_amount' => 'decimal:2',
            'approved' => 'boolean',
            'approved_at' => 'datetime',
            'approved_by_id' => 'integer',
            'active' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function posSale(): BelongsTo
    {
        return $this->belongsTo(PosSale::class);
    }

    public function salesReturn(): BelongsTo
    {
        return $this->belongsTo(SalesReturn::class);
    }

    public function posShift(): BelongsTo
    {
        return $this->belongsTo(PosShift::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_id');
    }

    public function posReturnLines(): HasMany
    {
        return $this->hasMany(PosReturnLine::class);
    }
}
