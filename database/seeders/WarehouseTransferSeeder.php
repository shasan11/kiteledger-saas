<?php

namespace Database\Seeders;

use App\Models\WarehouseTransfer;
use Illuminate\Database\Seeder;

class WarehouseTransferSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        WarehouseTransfer::factory()->count(5)->create();
    }
}
