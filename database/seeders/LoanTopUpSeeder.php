<?php

namespace Database\Seeders;

use App\Models\LoanTopUp;
use Illuminate\Database\Seeder;

class LoanTopUpSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        LoanTopUp::factory()->count(5)->create();
    }
}
