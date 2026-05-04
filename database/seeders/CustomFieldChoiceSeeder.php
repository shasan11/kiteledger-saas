<?php

namespace Database\Seeders;

use App\Models\CustomFieldChoice;
use Illuminate\Database\Seeder;

class CustomFieldChoiceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        CustomFieldChoice::factory()->count(5)->create();
    }
}
