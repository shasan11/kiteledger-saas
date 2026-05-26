<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionOrderExpense extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['production_order_id', 'expense_account_id', 'name', 'amount', 'notes'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:6'];
    }

    public function productionOrder(): BelongsTo { return $this->belongsTo(ProductionOrder::class); }
    public function expenseAccount(): BelongsTo { return $this->belongsTo(Account::class, 'expense_account_id'); }
}
