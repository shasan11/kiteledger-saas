<?php

namespace App\Models;

use App\Models\Concerns\HasFiscalYear;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductionOrder extends Model
{
    use HasFactory, HasFiscalYear, HasUuids;

    protected $fillable = [
        'branch_id',
        'fiscal_year_id', 'code', 'date', 'reference', 'bill_of_material_id',
        'finished_product_id', 'warehouse_id', 'product_unit_id', 'output_quantity',
        'total_raw_material_cost', 'total_expense_cost', 'total_byproduct_cost',
        'total_finished_goods_cost', 'total_production_cost', 'finished_goods_unit_cost',
        'status', 'approved', 'approved_at', 'approved_by_id', 'void', 'voided_at',
        'voided_by_id', 'voided_reason', 'notes', 'remarks', 'active', 'is_system_generated',
        'stock_posted', 'stock_posted_at', 'journal_voucher_id', 'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'output_quantity' => 'decimal:4',
            'total_raw_material_cost' => 'decimal:6',
            'total_expense_cost' => 'decimal:6',
            'total_byproduct_cost' => 'decimal:6',
            'total_finished_goods_cost' => 'decimal:6',
            'total_production_cost' => 'decimal:6',
            'finished_goods_unit_cost' => 'decimal:6',
            'approved' => 'boolean',
            'approved_at' => 'datetime',
            'approved_by_id' => 'integer',
            'void' => 'boolean',
            'voided_at' => 'datetime',
            'voided_by_id' => 'integer',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'stock_posted' => 'boolean',
            'stock_posted_at' => 'datetime',
            'user_add_id' => 'integer',
        ];
    }

    public function branch(): BelongsTo { return $this->belongsTo(Branch::class); }
    public function finishedProduct(): BelongsTo { return $this->belongsTo(Product::class, 'finished_product_id'); }
    public function warehouse(): BelongsTo { return $this->belongsTo(Warehouse::class); }
    public function productUnit(): BelongsTo { return $this->belongsTo(ProductUnit::class); }
    public function approvedBy(): BelongsTo { return $this->belongsTo(User::class, 'approved_by_id'); }
    public function voidedBy(): BelongsTo { return $this->belongsTo(User::class, 'voided_by_id'); }
    public function userAdd(): BelongsTo { return $this->belongsTo(User::class, 'user_add_id'); }
    public function journalVoucher(): BelongsTo { return $this->belongsTo(JournalVoucher::class); }

    public function rawMaterials(): HasMany { return $this->hasMany(ProductionOrderRawMaterial::class); }
    public function byproducts(): HasMany { return $this->hasMany(ProductionOrderByproduct::class); }
    public function expenses(): HasMany { return $this->hasMany(ProductionOrderExpense::class); }

    public function inventoryLedgers(): HasMany
    {
        return $this->hasMany(InventoryLedger::class, 'source_id')->where('source_type', 'production_order');
    }
}
