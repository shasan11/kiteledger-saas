<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class TaxSettings extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'tax_settings';

    protected $fillable = [
        'branch_id',
        'is_tax_registered',
        'registration_type',
        'tax_number',
        'tax_registered_name',
        'country_code',
        'default_currency',
        'registration_effective_date',
        'sales_tax_enabled',
        'sales_tax_name',
        'sales_tax_rate_percent',
        'default_sales_tax_rate_id',
        'sales_tax_account_id',
        'sales_tax_payable_account_id',
        'purchase_tax_enabled',
        'purchase_tax_name',
        'purchase_tax_rate_percent',
        'default_purchase_tax_rate_id',
        'purchase_tax_recoverable',
        'purchase_tax_account_id',
        'product_tax_behavior',
        'advanced_mode',
        'preset',
        'wizard_completed',
        'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'is_tax_registered'          => 'boolean',
            'sales_tax_enabled'          => 'boolean',
            'purchase_tax_enabled'       => 'boolean',
            'purchase_tax_recoverable'   => 'boolean',
            'advanced_mode'              => 'boolean',
            'wizard_completed'           => 'boolean',
            'sales_tax_rate_percent'     => 'decimal:4',
            'purchase_tax_rate_percent'  => 'decimal:4',
            'registration_effective_date' => 'date',
        ];
    }

    public function defaultSalesTaxRate(): BelongsTo
    {
        return $this->belongsTo(TaxRate::class, 'default_sales_tax_rate_id');
    }

    public function defaultPurchaseTaxRate(): BelongsTo
    {
        return $this->belongsTo(TaxRate::class, 'default_purchase_tax_rate_id');
    }

    public function salesTaxAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'sales_tax_account_id');
    }

    public function salesTaxPayableAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'sales_tax_payable_account_id');
    }

    public function purchaseTaxAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'purchase_tax_account_id');
    }
}
