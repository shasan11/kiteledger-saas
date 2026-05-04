<?php

namespace Database\Seeders;

use App\Models\TaxRegistration;
use Illuminate\Database\Seeder;

class TaxRegistrationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        TaxRegistration::factory()->count(5)->create();
    }
}
