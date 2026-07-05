<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TaxRate extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'tax_class_id',
        'tax_jurisdiction_id',
        'country_code',
        'tax_type',
        'name',
        'code',
        'rate_percent',
        'description',
        'inclusive',
        'calculation_method',
        'applies_on',
        'effective_from',
        'effective_to',
        'report_code',
        'active',
        'is_default',
        'is_system_generated',
        'user_add_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'rate_percent' => 'decimal:4',
            'inclusive' => 'boolean',
            'effective_from' => 'date',
            'effective_to' => 'date',
            'active' => 'boolean',
            'is_default' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }

    public function taxClass(): BelongsTo
    {
        return $this->belongsTo(TaxClass::class);
    }

    public function taxJurisdiction(): BelongsTo
    {
        return $this->belongsTo(TaxJurisdiction::class);
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function taxRateComponents(): HasMany
    {
        return $this->hasMany(TaxRateComponent::class);
    }

    public function taxRules(): HasMany
    {
        return $this->hasMany(TaxRule::class);
    }

    public function quotationLines(): HasMany
    {
        return $this->hasMany(QuotationLine::class);
    }

    public function salesOrderLines(): HasMany
    {
        return $this->hasMany(SalesOrderLine::class);
    }

    public function proformaInvoiceLines(): HasMany
    {
        return $this->hasMany(ProformaInvoiceLine::class);
    }

    public function invoiceLines(): HasMany
    {
        return $this->hasMany(InvoiceLine::class);
    }

    public function salesReturnLines(): HasMany
    {
        return $this->hasMany(SalesReturnLine::class);
    }

    public function purchaseOrderLines(): HasMany
    {
        return $this->hasMany(PurchaseOrderLine::class);
    }

    public function purchaseBillLines(): HasMany
    {
        return $this->hasMany(PurchaseBillLine::class);
    }

    public function expenseLines(): HasMany
    {
        return $this->hasMany(ExpenseLine::class);
    }

    public function debitNoteLines(): HasMany
    {
        return $this->hasMany(DebitNoteLine::class);
    }
}
