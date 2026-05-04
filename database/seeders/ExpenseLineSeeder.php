<?php

namespace Database\Seeders;

use App\Models\ExpenseLine;
use Illuminate\Database\Seeder;

class ExpenseLineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        ExpenseLine::factory()->count(5)->create();
    }
}
