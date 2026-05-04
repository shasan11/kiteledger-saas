<?php

namespace Database\Seeders;

use App\Models\CustomerPaymentLine;
use Illuminate\Database\Seeder;

class CustomerPaymentLineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        CustomerPaymentLine::factory()->count(5)->create();
    }
}
