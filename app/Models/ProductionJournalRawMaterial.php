<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionJournalRawMaterial extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'production_journal_id',
        'product_id',
        'quantity',
        'unit_code',
        'rate',
        'amount',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:4',
            'rate' => 'decimal:6',
            'amount' => 'decimal:6',
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
