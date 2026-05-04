<?php

namespace Database\Seeders;

use App\Models\ProjectTeam;
use Illuminate\Database\Seeder;

class ProjectTeamSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        ProjectTeam::factory()->count(5)->create();
    }
}
