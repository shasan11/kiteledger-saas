<?php

namespace Database\Seeders;

use App\Models\ChequeRegister;
use Illuminate\Database\Seeder;

class ChequeRegisterSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        ChequeRegister::factory()->count(5)->create();
    }
}
