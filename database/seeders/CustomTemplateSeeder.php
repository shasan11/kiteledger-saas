<?php

namespace Database\Seeders;

use App\Models\CustomTemplate;
use Illuminate\Database\Seeder;

class CustomTemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        CustomTemplate::factory()->count(5)->create();
    }
}
