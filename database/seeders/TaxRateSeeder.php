<?php

namespace Database\Seeders;

use App\Models\TaxClass;
use App\Models\TaxRate;
use Illuminate\Database\Seeder;

class TaxRateSeeder extends Seeder
{
    public function run(): void
    {
        $classId = TaxClass::query()->where('code', 'like', '%VAT%')->orWhere('name', 'like', '%VAT%')->value('id')
            ?: TaxClass::query()->value('id');

        if (!$classId) {
            return;
        }

        foreach ([
            ['VAT 13%', 'VAT13', 13, 'vat', 'both'],
            ['Zero Rated', 'ZERO', 0, 'vat', 'both'],
            ['Exempt', 'EXEMPT', 0, 'vat', 'both'],
            ['Withholding 1.5%', 'WHT15', 1.5, 'withholding', 'expense'],
        ] as [$name, $code, $rate, $type, $appliesOn]) {
            TaxRate::query()->updateOrCreate(
                ['code' => $code],
                [
                    'tax_class_id' => $classId,
                    'tax_jurisdiction_id' => null,
                    'country_code' => 'NP',
                    'tax_type' => $type,
                    'name' => $name,
                    'rate_percent' => $rate,
                    'inclusive' => false,
                    'calculation_method' => 'single',
                    'applies_on' => $appliesOn,
                    'effective_from' => now()->startOfYear()->toDateString(),
                    'effective_to' => null,
                    'report_code' => $code,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => null,
                ]
            );
        }
    }
}
