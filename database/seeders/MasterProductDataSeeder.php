<?php

namespace Database\Seeders;

use App\Models\ProductCategory;
use App\Models\ProductUnit;
use Illuminate\Database\Seeder;

class MasterProductDataSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'General', 'description' => 'General products'],
            ['name' => 'Goods', 'description' => 'Physical goods'],
            ['name' => 'Services', 'description' => 'Service products'],
            ['name' => 'Raw Materials', 'description' => 'Raw materials for production'],
            ['name' => 'Finished Goods', 'description' => 'Finished products'],
            ['name' => 'Consumables', 'description' => 'Consumable items'],
        ];

        foreach ($categories as $category) {
            ProductCategory::updateOrCreate(
                ['name' => $category['name']],
                ['description' => $category['description'] ?? null]
            );
        }

        $units = [
            ['short_name' => 'PCS', 'name' => 'Pcs'],
            ['short_name' => 'KG', 'name' => 'Kg'],
            ['short_name' => 'GRAM', 'name' => 'Gram'],
            ['short_name' => 'LITER', 'name' => 'Liter'],
            ['short_name' => 'METER', 'name' => 'Meter'],
            ['short_name' => 'BOX', 'name' => 'Box'],
            ['short_name' => 'CARTON', 'name' => 'Carton'],
            ['short_name' => 'HOUR', 'name' => 'Hour'],
            ['short_name' => 'DAY', 'name' => 'Day'],
            ['short_name' => 'SERVICE', 'name' => 'Service'],
        ];

        foreach ($units as $unit) {
            ProductUnit::updateOrCreate(
                ['short_name' => $unit['short_name']],
                [
                    'name' => $unit['name'],
                    'accept_fractional' => true,
                    'active' => true,
                    'is_system_generated' => true,
                ]
            );
        }
    }
}
