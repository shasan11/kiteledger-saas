<?php

namespace Database\Seeders;

use App\Models\LoanAccount;
use Illuminate\Database\Seeder;

class LoanAccountSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        LoanAccount::factory()->count(5)->create();
    }
}
