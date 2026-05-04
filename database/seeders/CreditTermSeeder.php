<?php

namespace Database\Seeders;

use App\Models\CreditTerm;
use Illuminate\Database\Seeder;

class CreditTermSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        CreditTerm::factory()->count(5)->create();
    }
}
