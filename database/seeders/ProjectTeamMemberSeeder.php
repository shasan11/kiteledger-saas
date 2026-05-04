<?php

namespace Database\Seeders;

use App\Models\ProjectTeamMember;
use Illuminate\Database\Seeder;

class ProjectTeamMemberSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        ProjectTeamMember::factory()->count(5)->create();
    }
}
