<?php

namespace Database\Seeders;

use App\Models\TaxExemption;
use Illuminate\Database\Seeder;

class TaxExemptionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        TaxExemption::factory()->count(5)->create();
    }
}
