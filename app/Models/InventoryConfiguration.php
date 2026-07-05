<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryConfiguration extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'default_warehouse_id', 'stock_valuation_method', 'negative_stock_allowed',
        'low_stock_alert_enabled', 'default_low_stock_threshold',
        'product_code_prefix', 'auto_generate_product_code',
        'active', 'is_system_generated', 'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'negative_stock_allowed' => 'boolean',
            'low_stock_alert_enabled' => 'boolean',
            'auto_generate_product_code' => 'boolean',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }
}
