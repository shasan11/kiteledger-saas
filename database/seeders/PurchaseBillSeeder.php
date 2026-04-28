<?php

namespace Database\Seeders;

use App\Models\PurchaseBill;
use Illuminate\Database\Seeder;

class PurchaseBillSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        PurchaseBill::factory()->count(5)->create();
    }
}
