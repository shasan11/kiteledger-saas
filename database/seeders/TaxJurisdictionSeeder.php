<?php

namespace Database\Seeders;

use App\Models\TaxJurisdiction;
use Illuminate\Database\Seeder;

class TaxJurisdictionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        TaxJurisdiction::factory()->count(5)->create();
    }
}
