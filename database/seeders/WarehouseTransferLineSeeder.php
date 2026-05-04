<?php

namespace Database\Seeders;

use App\Models\WarehouseTransferLine;
use Illuminate\Database\Seeder;

class WarehouseTransferLineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        WarehouseTransferLine::factory()->count(5)->create();
    }
}
