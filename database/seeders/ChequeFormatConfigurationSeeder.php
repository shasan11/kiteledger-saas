<?php

namespace Database\Seeders;

use App\Models\ChequeFormatConfiguration;
use Illuminate\Database\Seeder;

class ChequeFormatConfigurationSeeder extends Seeder
{
    public function run(): void
    {
        ChequeFormatConfiguration::query()->firstOrCreate(
            ['format_name' => 'Default Cheque Format', 'is_system_generated' => true],
            [
                'country' => 'Global',
                'paper_size' => 'Custom',
                'width' => 210,
                'height' => 90,
                'layout_json' => ChequeFormatConfiguration::defaultLayout(),
                'active' => true,
                'is_system_generated' => true,
            ]
        );
    }
}
