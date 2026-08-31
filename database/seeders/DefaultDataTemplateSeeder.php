<?php

namespace Database\Seeders;

use App\Models\Central\DefaultDataTemplate;
use App\Models\Central\DefaultTemplateItem;
use Illuminate\Database\Seeder;

class DefaultDataTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $template = DefaultDataTemplate::firstOrCreate(['slug' => 'standard-accounting'], [
            'name' => 'Standard Accounting', 'description' => 'A neutral chart and operational baseline for new workspaces.',
            'is_default' => true, 'is_active' => true,
        ]);
        DefaultTemplateItem::firstOrCreate(['template_id' => $template->id, 'category' => 'configuration', 'key' => 'base'], [
            'name' => 'Base configuration', 'payload' => ['seeders' => ['MasterDataSeeder', 'RolesAndPermissionsSeeder']],
            'sort_order' => 0, 'is_active' => true,
        ]);
    }
}
