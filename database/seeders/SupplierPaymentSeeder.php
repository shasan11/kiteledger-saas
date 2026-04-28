<?php

namespace Database\Seeders;

use App\Models\SupplierPayment;
use Illuminate\Database\Seeder;

class SupplierPaymentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        SupplierPayment::factory()->count(5)->create();
    }
}
