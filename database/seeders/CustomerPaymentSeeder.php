<?php

namespace Database\Seeders;

use App\Models\CustomerPayment;
use Illuminate\Database\Seeder;

class CustomerPaymentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        CustomerPayment::factory()->count(5)->create();
    }
}
