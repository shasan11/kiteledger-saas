<?php

namespace Database\Seeders;

use App\Models\SalesReturn;
use Illuminate\Database\Seeder;

class SalesReturnSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        SalesReturn::factory()->count(5)->create();
    }
}
