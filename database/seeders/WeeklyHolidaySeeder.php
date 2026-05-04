<?php

namespace Database\Seeders;

use App\Models\WeeklyHoliday;
use Illuminate\Database\Seeder;

class WeeklyHolidaySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        WeeklyHoliday::factory()->count(5)->create();
    }
}
