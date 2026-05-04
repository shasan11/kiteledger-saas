<?php

namespace Database\Seeders;

use App\Models\ProductVariantItem;
use Illuminate\Database\Seeder;

class ProductVariantItemSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        ProductVariantItem::factory()->count(5)->create();
    }
}
