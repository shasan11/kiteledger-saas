<?php

namespace Database\Seeders;

use App\Models\InventoryAdjustment;
use Illuminate\Database\Seeder;

class InventoryAdjustmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        InventoryAdjustment::factory()->count(5)->create();
    }
}
