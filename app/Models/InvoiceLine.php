<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceLine extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'invoice_id',
        'product_id',
        'product_name',
        'description',
        'qty',
        'unit_price',
        'discount_type',
        'discount_percent',
        'discount_amount',
        'tax_rate_id',
        'tax_jurisdiction_id',
        'tax_amount',
        'tax_breakup',
        'line_total',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'decimal:4',
            'unit_price' => 'decimal:2',
            'discount_type' => 'string',
            'discount_percent' => 'decimal:4',
            'discount_amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'tax_breakup' => 'array',
            'line_total' => 'decimal:2',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
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
