<?php

namespace Database\Seeders;

use App\Models\ProductTaxCategory;
use Illuminate\Database\Seeder;

class ProductTaxCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        ProductTaxCategory::factory()->count(5)->create();
    }
}
