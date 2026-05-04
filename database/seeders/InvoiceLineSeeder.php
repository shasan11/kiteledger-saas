<?php

namespace Database\Seeders;

use App\Models\InvoiceLine;
use Illuminate\Database\Seeder;

class InvoiceLineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        InvoiceLine::factory()->count(5)->create();
    }
}
