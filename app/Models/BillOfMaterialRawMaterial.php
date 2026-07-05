<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BillOfMaterialRawMaterial extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'bill_of_material_id', 'product_id', 'quantity', 'unit_code', 'wastage_percent', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:4',
            'wastage_percent' => 'decimal:4',
        ];
    }

    public function billOfMaterial(): BelongsTo
    {
        return $this->belongsTo(BillOfMaterial::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
