<?php

namespace Database\Seeders;

use App\Models\LeaveApplication;
use Illuminate\Database\Seeder;

class LeaveApplicationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        LeaveApplication::factory()->count(5)->create();
    }
}
