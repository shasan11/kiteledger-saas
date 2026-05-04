<?php

namespace Database\Seeders;

use App\Models\CrmActivity;
use Illuminate\Database\Seeder;

class CrmActivitySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        CrmActivity::factory()->count(5)->create();
    }
}
