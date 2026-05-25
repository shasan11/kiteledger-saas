<?php

namespace App\Services\Tax;

use App\Models\TaxClass;
use App\Models\TaxJurisdiction;
use App\Models\TaxRate;
use App\Models\TaxRegistration;
use App\Models\TaxReportTemplate;
use App\Models\TaxSettings;
use App\Models\TaxSystem;

/**
 * Applies country-aware preset templates to the tax tables.
 *
 * Preset data is driven by config/tax_presets.php — no per-country
 * if/else spaghetti here. Adding a new country = add a config entry.
 */
class TaxPresetService
{
    public function apply(TaxSettings $settings, string $preset): void
    {
        match ($preset) {
            'no_tax'             => $this->applyNoTax($settings),
            'standard_vat'       => $this->applyStandardVat($settings),
            'sales_tax_only'     => $this->applySalesTaxOnly($settings),
            'purchase_sales_vat' => $this->applyPurchaseSalesVat($settings),
            'custom'             => null, // user sets rates manually
            default              => null,
        };
    }

    // ── Simple preset shortcuts ───────────────────────────────────────────────

    private function applyNoTax(TaxSettings $settings): void
    {
        $settings->sales_tax_enabled    = false;
        $settings->purchase_tax_enabled = false;
        $settings->preset               = 'no_tax';
        $settings->wizard_completed     = true;
        $settings->save();
    }

    private function applyStandardVat(TaxSettings $settings): void
    {
        $country = $settings->country_code ?: 'NP';
        $config  = $this->countryConfig($country);
        $rate    = $settings->sales_tax_rate_percent ?: $config['default_rate'];
        $name    = $settings->sales_tax_name         ?: $config['tax_name'];

        [$jurisdiction, , $taxRate] = $this->findOrCreateRate(
            $country,
            $name,
            (float) $rate,
            'both',
            $config,
        );

        $settings->sales_tax_enabled             = true;
        $settings->purchase_tax_enabled          = true;
        $settings->default_sales_tax_rate_id     = $taxRate->id;
        $settings->default_purchase_tax_rate_id  = $taxRate->id;
        $settings->sales_tax_name                = $name;
        $settings->purchase_tax_name             = $name;
        $settings->sales_tax_rate_percent        = $rate;
        $settings->purchase_tax_rate_percent     = $rate;
        $settings->preset                        = 'standard_vat';
        $settings->wizard_completed              = true;
        $settings->save();

        $this->maybeCreateRegistration($settings, $jurisdiction);
        $this->seedReportTemplates($country, $config);
    }

    private function applySalesTaxOnly(TaxSettings $settings): void
    {
        $country = $settings->country_code ?: 'NP';
        $config  = $this->countryConfig($country);
        $rate    = $settings->sales_tax_rate_percent ?: $config['default_rate'];
        $name    = $settings->sales_tax_name         ?: $config['tax_name'];

        [, , $taxRate] = $this->findOrCreateRate($country, $name, (float) $rate, 'sale', $config);

        $settings->sales_tax_enabled            = true;
        $settings->purchase_tax_enabled         = false;
        $settings->default_sales_tax_rate_id    = $taxRate->id;
        $settings->default_purchase_tax_rate_id = null;
        $settings->sales_tax_name               = $name;
        $settings->sales_tax_rate_percent       = $rate;
        $settings->preset                       = 'sales_tax_only';
        $settings->wizard_completed             = true;
        $settings->save();

        $this->seedReportTemplates($country, $config);
    }

    private function applyPurchaseSalesVat(TaxSettings $settings): void
    {
        $country      = $settings->country_code ?: 'NP';
        $config       = $this->countryConfig($country);
        $salesRate    = $settings->sales_tax_rate_percent    ?: $config['default_rate'];
        $purchaseRate = $settings->purchase_tax_rate_percent ?: $salesRate;
        $name         = $settings->sales_tax_name            ?: $config['tax_name'];

        [$jurisdiction, , $salesTaxRate]    = $this->findOrCreateRate($country, $name, (float) $salesRate, 'sale', $config);
        [, , $purchaseTaxRate] = $this->findOrCreateRate($country, $name, (float) $purchaseRate, 'purchase', $config);

        $settings->sales_tax_enabled            = true;
        $settings->purchase_tax_enabled         = true;
        $settings->default_sales_tax_rate_id    = $salesTaxRate->id;
        $settings->default_purchase_tax_rate_id = $purchaseTaxRate->id;
        $settings->sales_tax_name               = $name;
        $settings->purchase_tax_name            = $name;
        $settings->sales_tax_rate_percent       = $salesRate;
        $settings->purchase_tax_rate_percent    = $purchaseRate;
        $settings->preset                       = 'purchase_sales_vat';
        $settings->wizard_completed             = true;
        $settings->save();

        $this->maybeCreateRegistration($settings, $jurisdiction);
        $this->seedReportTemplates($country, $config);
    }

    // ── Core helpers ─────────────────────────────────────────────────────────

    /**
     * Find or create: TaxSystem → TaxJurisdiction → TaxClass → TaxRate.
     *
     * @return array{TaxJurisdiction, TaxClass, TaxRate}
     */
    private function findOrCreateRate(
        string $country,
        string $name,
        float  $ratePercent,
        string $appliesOn,
        array  $config,
    ): array {
        $systemCfg = $config['tax_system'];
        $taxType   = $config['tax_type'];

        $taxSystem = TaxSystem::firstOrCreate(
            ['code' => $systemCfg['code']],
            [
                'country_code'        => $country,
                'name'                => $systemCfg['name'],
                'type'                => $systemCfg['type'],
                'active'              => true,
                'is_system_generated' => true,
            ]
        );

        $jurisdiction = TaxJurisdiction::firstOrCreate(
            ['country_code' => $country, 'tax_system' => $systemCfg['code']],
            [
                'name'                => "{$country} - {$name}",
                'code'                => strtoupper("{$country}-{$name}"),
                'tax_system_id'       => $taxSystem->id,
                'active'              => true,
                'is_system_generated' => true,
            ]
        );

        // Back-fill tax_system_id if jurisdiction existed before migration
        if (! $jurisdiction->tax_system_id) {
            $jurisdiction->update(['tax_system_id' => $taxSystem->id]);
        }

        $taxClass = TaxClass::firstOrCreate(
            ['code' => strtoupper($name), 'tax_jurisdiction_id' => $jurisdiction->id],
            [
                'name'                => $name,
                'country_code'        => $country,
                'tax_type'            => $taxType,
                'tax_behavior'        => 'standard',
                'active'              => true,
                'is_system_generated' => true,
            ]
        );

        $rateCode = strtoupper($name) . (int) $ratePercent;
        $taxRate  = TaxRate::firstOrCreate(
            [
                'code'                => $rateCode,
                'tax_class_id'        => $taxClass->id,
                'tax_jurisdiction_id' => $jurisdiction->id,
            ],
            [
                'name'                => "{$name} {$ratePercent}%",
                'country_code'        => $country,
                'tax_type'            => $taxType,
                'rate_percent'        => $ratePercent,
                'inclusive'           => false,
                'calculation_method'  => 'single',
                'applies_on'          => $appliesOn,
                'active'              => true,
                'is_system_generated' => true,
            ]
        );

        return [$jurisdiction, $taxClass, $taxRate];
    }

    private function maybeCreateRegistration(TaxSettings $settings, TaxJurisdiction $jurisdiction): void
    {
        if (! $settings->is_tax_registered || ! $settings->tax_number) {
            return;
        }

        TaxRegistration::firstOrCreate(
            [
                'registration_no'     => $settings->tax_number,
                'tax_jurisdiction_id' => $jurisdiction->id,
            ],
            [
                'registration_type'   => $settings->registration_type ?? 'vat',
                'legal_name'          => $settings->tax_registered_name,
                'effective_from'      => $settings->registration_effective_date,
                'active'              => true,
                'is_system_generated' => true,
            ]
        );
    }

    private function seedReportTemplates(string $country, array $config): void
    {
        if (empty($config['reports'])) {
            return;
        }

        $taxSystem = TaxSystem::where('code', $config['tax_system']['code'])->first();

        foreach ($config['reports'] as $key => $reportName) {
            TaxReportTemplate::firstOrCreate(
                ['country_code' => $country, 'report_key' => $key],
                [
                    'tax_system_id'       => $taxSystem?->id,
                    'report_name'         => $reportName,
                    'active'              => true,
                    'is_system_generated' => true,
                ]
            );
        }
    }

    // ── Config helper ─────────────────────────────────────────────────────────

    private function countryConfig(string $country): array
    {
        $presets = config('tax_presets', []);

        return $presets[$country] ?? [
            'name'         => "{$country} Tax",
            'currency'     => 'USD',
            'tax_system'   => [
                'code' => strtolower($country) . '_tax',
                'name' => "{$country} Tax",
                'type' => 'custom',
            ],
            'default_rate'     => 0,
            'tax_type'         => 'custom',
            'tax_name'         => 'Tax',
            'registration_types' => ['vat'],
            'reports'          => [],
        ];
    }
}
