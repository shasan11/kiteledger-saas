<?php

namespace Database\Seeders;

use App\Models\ProformaInvoice;
use Illuminate\Database\Seeder;

class ProformaInvoiceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        ProformaInvoice::factory()->count(5)->create();
    }
}
