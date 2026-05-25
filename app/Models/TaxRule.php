<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaxRule extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'tax_jurisdiction_id',
        'tax_rate_id',
        'product_tax_category_id',
        'country_code',
        'transaction_type',
        'customer_type',
        'supply_type',
        'from_state_code',
        'to_state_code',
        'reverse_charge',
        'conditions',
        'actions',
        'priority',
        'active',
        'is_system_generated',
        'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'reverse_charge'      => 'boolean',
            'conditions'          => 'array',
            'actions'             => 'array',
            'priority'            => 'integer',
            'active'              => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id'         => 'integer',
        ];
    }

    public function taxJurisdiction(): BelongsTo
    {
        return $this->belongsTo(TaxJurisdiction::class);
    }

    public function taxRate(): BelongsTo
    {
        return $this->belongsTo(TaxRate::class);
    }

    public function productTaxCategory(): BelongsTo
    {
        return $this->belongsTo(ProductTaxCategory::class);
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
