<?php

namespace Database\Seeders;

use App\Models\ReportingTagLine;
use Illuminate\Database\Seeder;

class ReportingTagLineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        ReportingTagLine::factory()->count(5)->create();
    }
}
