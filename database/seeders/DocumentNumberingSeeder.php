<?php

namespace Database\Seeders;

use App\Models\DocumentNumbering;
use Illuminate\Database\Seeder;

class DocumentNumberingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DocumentNumbering::factory()->count(5)->create();
    }
}
