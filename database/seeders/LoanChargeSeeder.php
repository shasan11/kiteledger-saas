<?php

namespace Database\Seeders;

use App\Models\LoanCharge;
use Illuminate\Database\Seeder;

class LoanChargeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        LoanCharge::factory()->count(5)->create();
    }
}
