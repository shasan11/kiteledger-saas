<?php

namespace Database\Seeders;

use App\Models\ReportingTag;
use Illuminate\Database\Seeder;

class ReportingTagSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        ReportingTag::factory()->count(5)->create();
    }
}
