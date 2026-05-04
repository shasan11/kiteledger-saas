<?php

namespace Database\Seeders;

use App\Models\QuotationLine;
use Illuminate\Database\Seeder;

class QuotationLineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        QuotationLine::factory()->count(5)->create();
    }
}
