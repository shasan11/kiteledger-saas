<?php

namespace App\Models;

use App\Models\Concerns\HasFiscalYear;
use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PosShift extends Model
{
    use HasFactory, HasFiscalYear, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'branch_id',
        'fiscal_year_id',
        'pos_terminal_id',
        'cashier_id',
        'shift_no',
        'opened_at',
        'closed_at',
        'opening_cash',
        'expected_cash',
        'counted_cash',
        'cash_difference',
        'total_sales',
        'total_cash_sales',
        'total_card_sales',
        'total_online_sales',
        'total_refunds',
        'total_expenses',
        'notes',
        'closing_notes',
        'status',
        'active',
        'is_system_generated',
        'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
            'opening_cash' => 'decimal:2',
            'expected_cash' => 'decimal:2',
            'counted_cash' => 'decimal:2',
            'cash_difference' => 'decimal:2',
            'total_sales' => 'decimal:2',
            'total_cash_sales' => 'decimal:2',
            'total_card_sales' => 'decimal:2',
            'total_online_sales' => 'decimal:2',
            'total_refunds' => 'decimal:2',
            'total_expenses' => 'decimal:2',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function posTerminal(): BelongsTo
    {
        return $this->belongsTo(PosTerminal::class);
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function posSales(): HasMany
    {
        return $this->hasMany(PosSale::class);
    }

    public function posCashMovements(): HasMany
    {
        return $this->hasMany(PosCashMovement::class);
    }

    public function posReturns(): HasMany
    {
        return $this->hasMany(PosReturn::class);
    }
}
