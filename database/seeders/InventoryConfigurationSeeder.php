<?php

namespace Database\Seeders;

use App\Models\InventoryConfiguration;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class InventoryConfigurationSeeder extends Seeder
{
    public function run(): void
    {
        InventoryConfiguration::query()->firstOrCreate(
            ['active' => true],
            [
                'default_warehouse_id' => Warehouse::query()->where('active', true)->value('id'),
                'stock_valuation_method' => 'FIFO',
                'negative_stock_allowed' => false,
                'low_stock_alert_enabled' => true,
                'default_low_stock_threshold' => 10,
                'product_code_prefix' => 'PROD',
                'auto_generate_product_code' => true,
                'is_system_generated' => true,
                'user_add_id' => null,
            ]
        );
    }
}
