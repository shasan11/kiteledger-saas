<?php

namespace Database\Seeders;

use App\Models\TaxReportTemplate;
use App\Models\TaxSystem;
use Illuminate\Database\Seeder;

/**
 * Seeds tax_report_templates for every country defined in config/tax_presets.php.
 *
 * Safe to run multiple times — uses firstOrCreate on (country_code, report_key).
 */
class TaxReportTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $presets = config('tax_presets', []);
        $count   = 0;

        foreach ($presets as $countryCode => $config) {
            if (empty($config['reports'])) {
                continue;
            }

            $systemCode = $config['tax_system']['code'] ?? null;
            $taxSystem  = $systemCode
                ? TaxSystem::where('code', $systemCode)->first()
                : null;

            foreach ($config['reports'] as $reportKey => $reportName) {
                TaxReportTemplate::firstOrCreate(
                    [
                        'country_code' => $countryCode,
                        'report_key'   => $reportKey,
                    ],
                    [
                        'tax_system_id'       => $taxSystem?->id,
                        'report_name'         => $reportName,
                        'active'              => true,
                        'is_system_generated' => true,
                    ]
                );
                $count++;
            }
        }

        $this->command->info("TaxReportTemplateSeeder: {$count} report templates seeded.");
    }
}
