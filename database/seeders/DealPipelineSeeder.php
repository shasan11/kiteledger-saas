<?php

namespace Database\Seeders;

use App\Models\DealPipeline;
use Illuminate\Database\Seeder;

class DealPipelineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DealPipeline::factory()->count(5)->create();
    }
}
