<?php

namespace Database\Seeders;

use App\Models\TaxRateComponent;
use Illuminate\Database\Seeder;

class TaxRateComponentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        TaxRateComponent::factory()->count(5)->create();
    }
}
