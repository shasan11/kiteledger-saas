<?php

namespace Database\Seeders;

use App\Models\JournalVoucher;
use Illuminate\Database\Seeder;

class JournalVoucherSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        JournalVoucher::factory()->count(5)->create();
    }
}
