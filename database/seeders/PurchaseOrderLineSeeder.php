<?php

namespace Database\Seeders;

use App\Models\PurchaseOrderLine;
use Illuminate\Database\Seeder;

class PurchaseOrderLineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        PurchaseOrderLine::factory()->count(5)->create();
    }
}
