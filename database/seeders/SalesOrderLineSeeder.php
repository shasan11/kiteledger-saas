<?php

namespace Database\Seeders;

use App\Models\SalesOrderLine;
use Illuminate\Database\Seeder;

class SalesOrderLineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        SalesOrderLine::factory()->count(5)->create();
    }
}
