<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesReturnLine extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'sales_return_id',
        'product_id',
        'custom_product_name',
        'discount_percent',
        'discount_amount',
        'description',
        'qty',
        'unit_price',
        'tax_rate_id',
        'tax_jurisdiction_id',
        'tax_amount',
        'tax_breakup',
        'line_total',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'qty' => 'decimal:4',
            'unit_price' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'tax_breakup' => 'array',
            'line_total' => 'decimal:2',
        ];
    }

    public function salesReturn(): BelongsTo
    {
        return $this->belongsTo(SalesReturn::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function taxRate(): BelongsTo
    {
        return $this->belongsTo(TaxRate::class);
    }

    public function taxJurisdiction(): BelongsTo
    {
        return $this->belongsTo(TaxJurisdiction::class);
    }
}
