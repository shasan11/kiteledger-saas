<?php

namespace Database\Seeders;

use App\Models\PurchaseBillLine;
use Illuminate\Database\Seeder;

class PurchaseBillLineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        PurchaseBillLine::factory()->count(5)->create();
    }
}
