<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosReturnLine extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'pos_return_id',
        'pos_sale_line_id',
        'product_id',
        'qty',
        'unit_price',
        'tax_amount',
        'line_total',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'decimal:4',
            'unit_price' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'line_total' => 'decimal:2',
        ];
    }

    public function posReturn(): BelongsTo
    {
        return $this->belongsTo(PosReturn::class);
    }

    public function posSaleLine(): BelongsTo
    {
        return $this->belongsTo(PosSaleLine::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
