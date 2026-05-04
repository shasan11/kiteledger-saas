<?php

namespace Database\Seeders;

use App\Models\AssignedTask;
use Illuminate\Database\Seeder;

class AssignedTaskSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        AssignedTask::factory()->count(5)->create();
    }
}
