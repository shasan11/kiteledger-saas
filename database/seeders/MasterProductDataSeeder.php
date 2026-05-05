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
            ['code' => 'PCS', 'name' => 'Pcs'],
            ['code' => 'KG', 'name' => 'Kg'],
            ['code' => 'GRAM', 'name' => 'Gram'],
            ['code' => 'LITER', 'name' => 'Liter'],
            ['code' => 'METER', 'name' => 'Meter'],
            ['code' => 'BOX', 'name' => 'Box'],
            ['code' => 'CARTON', 'name' => 'Carton'],
            ['code' => 'HOUR', 'name' => 'Hour'],
            ['code' => 'DAY', 'name' => 'Day'],
            ['code' => 'SERVICE', 'name' => 'Service'],
        ];

        foreach ($units as $unit) {
            ProductUnit::updateOrCreate(
                ['code' => $unit['code']],
                ['name' => $unit['name']]
            );
        }
    }
}
