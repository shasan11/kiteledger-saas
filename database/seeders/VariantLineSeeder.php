<?php

namespace Database\Seeders;

use App\Models\VariantLine;
use Illuminate\Database\Seeder;

class VariantLineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        VariantLine::factory()->count(5)->create();
    }
}
