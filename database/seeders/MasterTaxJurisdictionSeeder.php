<?php

namespace Database\Seeders;

use App\Models\TaxJurisdiction;
use App\Models\TaxSystem;
use Illuminate\Database\Seeder;

class MasterTaxJurisdictionSeeder extends Seeder
{
    public function run(): void
    {
        $jurisdictions = [
            [
                'country_code' => 'NP',
                'name'         => 'Nepal VAT',
                'code'         => 'NP-VAT',
                'tax_system'   => 'nepal_vat',
            ],
            [
                'country_code' => 'IN',
                'name'         => 'India GST',
                'code'         => 'IN-GST',
                'tax_system'   => 'india_gst',
            ],
            [
                'country_code' => 'US',
                'name'         => 'USA Sales Tax',
                'code'         => 'US-SALES-TAX',
                'tax_system'   => 'usa_sales_tax',
            ],
        ];

        foreach ($jurisdictions as $data) {
            // Resolve the tax_system_id from the tax_systems table
            $taxSystem = TaxSystem::where('code', $data['tax_system'])->first();

            TaxJurisdiction::updateOrCreate(
                ['code' => $data['code']],
                array_merge($data, [
                    'tax_system_id'       => $taxSystem?->id,
                    'active'              => true,
                    'is_system_generated' => true,
                ])
            );
        }
    }
}
