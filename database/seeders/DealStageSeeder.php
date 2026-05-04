<?php

namespace Database\Seeders;

use App\Models\DealStage;
use Illuminate\Database\Seeder;

class DealStageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DealStage::factory()->count(5)->create();
    }
}
