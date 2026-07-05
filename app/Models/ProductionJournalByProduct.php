<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionJournalByProduct extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'production_journal_id',
        'product_id',
        'cost_percent',
        'quantity',
        'unit_code',
        'allocated_cost',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'cost_percent' => 'decimal:4',
            'quantity' => 'decimal:4',
            'allocated_cost' => 'decimal:6',
        ];
    }

    public function productionJournal(): BelongsTo
    {
        return $this->belongsTo(ProductionJournal::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
