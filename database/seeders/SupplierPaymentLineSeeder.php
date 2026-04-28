<?php

namespace Database\Seeders;

use App\Models\SupplierPaymentLine;
use Illuminate\Database\Seeder;

class SupplierPaymentLineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        SupplierPaymentLine::factory()->count(5)->create();
    }
}
