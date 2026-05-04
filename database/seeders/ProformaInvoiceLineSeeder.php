<?php

namespace Database\Seeders;

use App\Models\ProformaInvoiceLine;
use Illuminate\Database\Seeder;

class ProformaInvoiceLineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        ProformaInvoiceLine::factory()->count(5)->create();
    }
}
