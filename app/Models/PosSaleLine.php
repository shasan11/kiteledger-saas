<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosSaleLine extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'pos_sale_id',
        'product_id',
        'product_name',
        'product_code',
        'barcode',
        'qty',
        'unit_price',
        'discount_percent',
        'discount_amount',
        'tax_rate_id',
        'tax_amount',
        'line_total',
        'returned_qty',
        'is_complimentary',
        'complimentary_reason',
        'remarks',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'decimal:4',
            'unit_price' => 'decimal:2',
            'discount_percent' => 'decimal:4',
            'discount_amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'line_total' => 'decimal:2',
            'returned_qty' => 'decimal:4',
            'is_complimentary' => 'boolean',
            'active' => 'boolean',
        ];
    }

    public function posSale(): BelongsTo
    {
        return $this->belongsTo(PosSale::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function taxRate(): BelongsTo
    {
        return $this->belongsTo(TaxRate::class);
    }
}
