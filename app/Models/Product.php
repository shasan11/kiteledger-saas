<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'branch_id',
        'parent_id',
        'product_category_id',
        'product_tax_category_id',
        'name',
        'code',
        'sku',
        'barcode',
        'description',
        'product_unit_id',
        'tax_class_id',
        'product_type',
        'sales_account_id',
        'purchase_account_id',
        'sales_return_account_id',
        'purchase_return_account_id',
        'valuation_method',
        'reorder_level',
        'purchase_price',
        'selling_price',
        'track_inventory',
        'allow_sale',
        'allow_purchase',
        'active',
        'is_system_generated',
        'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'reorder_level' => 'decimal:4',
            'purchase_price' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'track_inventory' => 'boolean',
            'allow_sale' => 'boolean',
            'allow_purchase' => 'boolean',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'parent_id');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(Product::class, 'parent_id');
    }

    public function productCategory(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'product_category_id');
    }

    public function productTaxCategory(): BelongsTo
    {
        return $this->belongsTo(ProductTaxCategory::class, 'product_tax_category_id');
    }

    public function productUnit(): BelongsTo
    {
        return $this->belongsTo(ProductUnit::class, 'product_unit_id');
    }

    public function taxClass(): BelongsTo
    {
        return $this->belongsTo(TaxClass::class, 'tax_class_id');
    }

    public function salesAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'sales_account_id');
    }

    public function purchaseAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'purchase_account_id');
    }

    public function salesReturnAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'sales_return_account_id');
    }

    public function purchaseReturnAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'purchase_return_account_id');
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_add_id');
    }

    public function productVariantItems(): HasMany
    {
        return $this->hasMany(ProductVariantItem::class, 'product_id');
    }

    public function quotationLines(): HasMany
    {
        return $this->hasMany(QuotationLine::class, 'product_id');
    }

    public function invoiceLines(): HasMany
    {
        return $this->hasMany(InvoiceLine::class, 'product_id');
    }

    public function salesOrderLines(): HasMany
    {
        return $this->hasMany(SalesOrderLine::class, 'product_id');
    }

    public function proformaInvoiceLines(): HasMany
    {
        return $this->hasMany(ProformaInvoiceLine::class, 'product_id');
    }

    public function salesReturnLines(): HasMany
    {
        return $this->hasMany(SalesReturnLine::class, 'product_id');
    }

    public function purchaseOrderLines(): HasMany
    {
        return $this->hasMany(PurchaseOrderLine::class, 'product_id');
    }

    public function purchaseBillLines(): HasMany
    {
        return $this->hasMany(PurchaseBillLine::class, 'product_id');
    }

    public function debitNoteLines(): HasMany
    {
        return $this->hasMany(DebitNoteLine::class, 'product_id');
    }

    public function inventoryAdjustmentLines(): HasMany
    {
        return $this->hasMany(InventoryAdjustmentLine::class, 'product_id');
    }

    public function warehouseTransferLines(): HasMany
    {
        return $this->hasMany(WarehouseTransferLine::class, 'product_id');
    }
}
