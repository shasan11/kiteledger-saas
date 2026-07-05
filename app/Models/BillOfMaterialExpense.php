<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BillOfMaterialExpense extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'bill_of_material_id', 'cost_term_id', 'amount', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:6',
        ];
    }

    public function billOfMaterial(): BelongsTo
    {
        return $this->belongsTo(BillOfMaterial::class);
    }

    public function costTerm(): BelongsTo
    {
        return $this->belongsTo(ProductionCostTerm::class, 'cost_term_id');
    }
}
