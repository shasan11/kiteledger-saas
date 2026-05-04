<?php

namespace Database\Seeders;

use App\Models\CashTransferLine;
use Illuminate\Database\Seeder;

class CashTransferLineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        CashTransferLine::factory()->count(5)->create();
    }
}
