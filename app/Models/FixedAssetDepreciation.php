<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class FixedAssetDepreciation extends Model
{
    use HasUuids, RequiresTenantConnection;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['depreciation_date' => 'date', 'amount' => 'decimal:2'];
    }

    public function asset()
    {
        return $this->belongsTo(FixedAsset::class, 'fixed_asset_id');
    }

    public function journalVoucher()
    {
        return $this->belongsTo(JournalVoucher::class);
    }
}
