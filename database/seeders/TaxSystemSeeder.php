<?php

namespace Database\Seeders;

use App\Models\TaxSystem;
use Illuminate\Database\Seeder;

/**
 * Seeds the tax_systems table with built-in systems for all countries
 * that ship with a preset in config/tax_presets.php.
 *
 * Safe to run multiple times — uses firstOrCreate.
 */
class TaxSystemSeeder extends Seeder
{
    public function run(): void
    {
        $systems = [
            // Nepal
            ['country_code' => 'NP', 'code' => 'nepal_vat',         'name' => 'Nepal VAT',               'type' => 'vat'],
            ['country_code' => 'NP', 'code' => 'nepal_withholding',  'name' => 'Nepal Withholding (TDS)',  'type' => 'withholding'],

            // India
            ['country_code' => 'IN', 'code' => 'india_gst',          'name' => 'India GST',                'type' => 'gst'],
            ['country_code' => 'IN', 'code' => 'india_tds',          'name' => 'India TDS',                'type' => 'withholding'],
            ['country_code' => 'IN', 'code' => 'india_tcs',          'name' => 'India TCS',                'type' => 'withholding'],

            // United States
            ['country_code' => 'US', 'code' => 'usa_sales_tax',      'name' => 'USA Sales Tax',            'type' => 'sales_tax'],

            // United Kingdom
            ['country_code' => 'GB', 'code' => 'gb_vat',             'name' => 'UK VAT',                   'type' => 'vat'],

            // France
            ['country_code' => 'FR', 'code' => 'france_tva',         'name' => 'France TVA',               'type' => 'vat'],

            // UAE
            ['country_code' => 'AE', 'code' => 'uae_vat',            'name' => 'UAE VAT',                  'type' => 'vat'],

            // Australia
            ['country_code' => 'AU', 'code' => 'australia_gst',      'name' => 'Australia GST',            'type' => 'gst'],

            // Canada
            ['country_code' => 'CA', 'code' => 'canada_gst',         'name' => 'Canada GST/HST',           'type' => 'gst'],
            ['country_code' => 'CA', 'code' => 'canada_pst',         'name' => 'Canada PST',               'type' => 'sales_tax'],

            // Singapore
            ['country_code' => 'SG', 'code' => 'singapore_gst',      'name' => 'Singapore GST',            'type' => 'gst'],

            // Germany
            ['country_code' => 'DE', 'code' => 'germany_mwst',       'name' => 'Germany MwSt (VAT)',        'type' => 'vat'],

            // New Zealand
            ['country_code' => 'NZ', 'code' => 'nz_gst',             'name' => 'New Zealand GST',          'type' => 'gst'],

            // South Africa
            ['country_code' => 'ZA', 'code' => 'sa_vat',             'name' => 'South Africa VAT',         'type' => 'vat'],

            // Generic/custom fallback
            ['country_code' => 'XX', 'code' => 'custom',             'name' => 'Custom Tax',               'type' => 'custom'],
        ];

        foreach ($systems as $system) {
            TaxSystem::firstOrCreate(
                ['code' => $system['code']],
                [
                    'country_code'        => $system['country_code'],
                    'name'                => $system['name'],
                    'type'                => $system['type'],
                    'active'              => true,
                    'is_system_generated' => true,
                ]
            );
        }

        $this->command->info('TaxSystemSeeder: ' . count($systems) . ' tax systems seeded.');
    }
}
