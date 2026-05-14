<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaxSlab extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['country', 'fiscal_year', 'income_from', 'income_to', 'rate', 'fixed_amount', 'active'];

    protected function casts(): array
    {
        return [
            'income_from' => 'decimal:2',
            'income_to' => 'decimal:2',
            'rate' => 'decimal:4',
            'fixed_amount' => 'decimal:2',
            'active' => 'boolean',
        ];
    }
}
