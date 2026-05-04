<?php

namespace Database\Seeders;

use App\Models\CustomFieldValue;
use Illuminate\Database\Seeder;

class CustomFieldValueSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        CustomFieldValue::factory()->count(5)->create();
    }
}
