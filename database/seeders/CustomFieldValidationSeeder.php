<?php

namespace Database\Seeders;

use App\Models\CustomFieldValidation;
use Illuminate\Database\Seeder;

class CustomFieldValidationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        CustomFieldValidation::factory()->count(5)->create();
    }
}
