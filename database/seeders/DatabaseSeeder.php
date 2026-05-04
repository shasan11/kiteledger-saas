<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            MainBranchSeeder::class,
            CurrencySeeder::class,
            ContactGroupSeeder::class,
            ContactSeeder::class
            //AccountingSeeder::class,
        ]);
    }
}
