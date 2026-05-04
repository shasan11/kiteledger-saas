<?php

namespace Database\Seeders;

use App\Models\JournalVoucherLine;
use Illuminate\Database\Seeder;

class JournalVoucherLineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        JournalVoucherLine::factory()->count(5)->create();
    }
}
