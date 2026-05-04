<?php

namespace Database\Seeders;

use App\Models\CustomFieldModule;
use Illuminate\Database\Seeder;

class CustomFieldModuleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        CustomFieldModule::factory()->count(5)->create();
    }
}
