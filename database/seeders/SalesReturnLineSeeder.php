<?php

namespace Database\Seeders;

use App\Models\SalesReturnLine;
use Illuminate\Database\Seeder;

class SalesReturnLineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        SalesReturnLine::factory()->count(5)->create();
    }
}
