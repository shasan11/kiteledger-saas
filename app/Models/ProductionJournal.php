<?php

namespace App\Models;

use App\Models\Concerns\HasFiscalYear;
use App\Models\Concerns\HasReportingTags;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductionJournal extends Model
{
    use HasFactory, HasFiscalYear, HasReportingTags, HasUuids;

    protected $fillable = [
        'branch_id',
        'fiscal_year_id',
        'code',
        'date',
        'reference',
        'finished_product_id',
        'output_quantity',
        'output_unit_code',
        'warehouse_id',
        'raw_material_cost',
        'production_expense_amount',
        'total_cost_of_production',
        'by_product_allocated_cost',
        'finished_goods_cost',
        'cost_per_unit',
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
        'voided_at',
        'voided_by_id',
        'voided_reason',
        'journal_voucher_id',
        'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'output_quantity' => 'decimal:4',
            'raw_material_cost' => 'decimal:6',
            'production_expense_amount' => 'decimal:6',
            'total_cost_of_production' => 'decimal:6',
            'by_product_allocated_cost' => 'decimal:6',
            'finished_goods_cost' => 'decimal:6',
            'cost_per_unit' => 'decimal:6',
            'active' => 'boolean',
            'approved' => 'boolean',
            'approved_at' => 'datetime',
            'approved_by_id' => 'integer',
            'stock_posted' => 'boolean',
            'stock_posted_at' => 'datetime',
            'void' => 'boolean',
            'voided_at' => 'datetime',
            'voided_by_id' => 'integer',
            'user_add_id' => 'integer',
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

    public function finishedProduct(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'finished_product_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_id');
    }

    public function voidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by_id');
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_add_id');
    }

    public function journalVoucher(): BelongsTo
    {
        return $this->belongsTo(JournalVoucher::class);
    }

    public function rawMaterials(): HasMany
    {
        return $this->hasMany(ProductionJournalRawMaterial::class);
    }

    public function productionExpenses(): HasMany
    {
        return $this->hasMany(ProductionJournalExpense::class);
    }

    public function byProducts(): HasMany
    {
        return $this->hasMany(ProductionJournalByProduct::class);
    }

    public function inventoryLedgers(): HasMany
    {
        return $this->hasMany(InventoryLedger::class, 'source_id')
            ->where('source_type', 'production_journal');
    }
}
