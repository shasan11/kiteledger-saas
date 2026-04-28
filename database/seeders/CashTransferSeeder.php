<?php

namespace Database\Seeders;

use App\Models\CashTransfer;
use Illuminate\Database\Seeder;

class CashTransferSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        CashTransfer::factory()->count(5)->create();
    }
}
