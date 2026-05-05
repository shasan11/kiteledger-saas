<?php

namespace Database\Seeders;

use App\Models\TaxJurisdiction;
use Illuminate\Database\Seeder;

class MasterTaxJurisdictionSeeder extends Seeder
{
    public function run(): void
    {
        $jurisdictions = [
            ['country_code' => 'NP', 'name' => 'Nepal VAT', 'code' => 'NP-VAT', 'tax_system' => 'nepal_vat'],
            ['country_code' => 'IN', 'name' => 'India GST', 'code' => 'IN-GST', 'tax_system' => 'india_gst'],
            ['country_code' => 'US', 'name' => 'USA Sales Tax', 'code' => 'US-SALES-TAX', 'tax_system' => 'usa_sales_tax'],
        ];

        foreach ($jurisdictions as $jurisdiction) {
            TaxJurisdiction::updateOrCreate(
                ['code' => $jurisdiction['code']],
                $jurisdiction
            );
        }
    }
}
