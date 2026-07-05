<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionJournalExpense extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'production_journal_id',
        'cost_term_id',
        'amount',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:6',
        ];
    }

    public function productionJournal(): BelongsTo
    {
        return $this->belongsTo(ProductionJournal::class);
    }

    public function costTerm(): BelongsTo
    {
        return $this->belongsTo(ProductionCostTerm::class, 'cost_term_id');
    }
}
