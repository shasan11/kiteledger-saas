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

class SalesOrder extends Model
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
        'sales_order_no',
        'sales_order_date',
        'contact_id',
        'warehouse_id',
        'currency_id',
        'reference',
        'notes',
        'remarks',
        'subtotal',
        'discount_total',
        'tax_total',
        'grand_total',
        'status',
        'active',
        'approved',
        'approved_at',
        'approved_by_id',
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
            'sales_order_date' => 'date',
            'subtotal' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'active' => 'boolean',
            'approved' => 'boolean',
            'approved_at' => 'datetime',
            'approved_by_id' => 'integer',
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

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
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

    public function salesOrderLines(): HasMany
    {
        return $this->hasMany(SalesOrderLine::class);
    }
}
