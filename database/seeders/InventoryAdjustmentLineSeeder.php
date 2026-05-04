<?php

namespace Database\Seeders;

use App\Models\InventoryAdjustmentLine;
use Illuminate\Database\Seeder;

class InventoryAdjustmentLineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        InventoryAdjustmentLine::factory()->count(5)->create();
    }
}
