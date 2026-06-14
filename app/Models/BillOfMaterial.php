<?php

namespace App\Models;

use App\Models\Concerns\HasFiscalYear;
use App\Models\Concerns\HasReportingTags;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BillOfMaterial extends Model
{
    use HasFactory, HasFiscalYear, HasReportingTags, HasUuids;

    protected $table = 'bills_of_material';

    protected $fillable = [
        'branch_id', 'fiscal_year_id', 'code', 'date', 'reference',
        'product_id', 'output_quantity', 'output_unit_code',
        'manufacture_on_every_sale', 'notes', 'remarks', 'status', 'active',
        'approved', 'approved_at', 'approved_by_id', 'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'date'                     => 'date',
            'output_quantity'          => 'decimal:4',
            'manufacture_on_every_sale' => 'boolean',
            'active'                   => 'boolean',
            'approved'                 => 'boolean',
            'approved_at'              => 'datetime',
            'approved_by_id'           => 'integer',
            'user_add_id'              => 'integer',
        ];
    }

    public function branch(): BelongsTo      { return $this->belongsTo(Branch::class); }
    public function product(): BelongsTo     { return $this->belongsTo(Product::class); }
    public function approvedBy(): BelongsTo  { return $this->belongsTo(User::class, 'approved_by_id'); }
    public function userAdd(): BelongsTo     { return $this->belongsTo(User::class, 'user_add_id'); }

    public function rawMaterials(): HasMany  { return $this->hasMany(BillOfMaterialRawMaterial::class); }
    public function byProducts(): HasMany    { return $this->hasMany(BillOfMaterialByProduct::class); }
    public function expenses(): HasMany      { return $this->hasMany(BillOfMaterialExpense::class); }
}
