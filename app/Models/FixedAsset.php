<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class FixedAsset extends Model
{
    use HasUuids, RequiresTenantConnection;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['purchase_date' => 'date', 'in_service_date' => 'date', 'disposed_at' => 'date', 'cost' => 'decimal:2', 'salvage_value' => 'decimal:2', 'accumulated_depreciation' => 'decimal:2', 'book_value' => 'decimal:2', 'disposal_proceeds' => 'decimal:2'];
    }

    public function depreciations()
    {
        return $this->hasMany(FixedAssetDepreciation::class);
    }
}
