<?php

namespace Database\Seeders;

use App\Models\DealPipeline;
use App\Models\DealStage;
use Illuminate\Database\Seeder;

class MasterDealDataSeeder extends Seeder
{
    public function run(): void
    {
        $pipeline = DealPipeline::updateOrCreate(
            ['name' => 'Sales Pipeline'],
            ['is_default' => true]
        );

        $stages = [
            ['name' => 'New', 'probability' => 5, 'is_won_stage' => false, 'is_lost_stage' => false],
            ['name' => 'Contacted', 'probability' => 15, 'is_won_stage' => false, 'is_lost_stage' => false],
            ['name' => 'Qualified', 'probability' => 30, 'is_won_stage' => false, 'is_lost_stage' => false],
            ['name' => 'Proposal Sent', 'probability' => 50, 'is_won_stage' => false, 'is_lost_stage' => false],
            ['name' => 'Negotiation', 'probability' => 70, 'is_won_stage' => false, 'is_lost_stage' => false],
            ['name' => 'Won', 'probability' => 100, 'is_won_stage' => true, 'is_lost_stage' => false],
            ['name' => 'Lost', 'probability' => 0, 'is_won_stage' => false, 'is_lost_stage' => true],
        ];

        foreach ($stages as $stage) {
            DealStage::updateOrCreate(
                ['name' => $stage['name'], 'deal_pipeline_id' => $pipeline->id],
                $stage
            );
        }
    }
}
