<?php

namespace App\Services\Tax;

use App\Models\TaxClass;
use App\Models\TaxJurisdiction;
use App\Models\TaxRate;
use App\Models\TaxRegistration;
use App\Models\TaxSettings;

/**
 * Applies simple preset templates to the advanced tax tables.
 *
 * Each preset finds-or-creates the necessary TaxJurisdiction, TaxClass,
 * and TaxRate records, then updates TaxSettings to point at them.
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
            default              => null,
        };
    }

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
        $rate    = $settings->sales_tax_rate_percent ?: 13;
        $name    = $settings->sales_tax_name ?: 'VAT';
        $country = $settings->country_code ?: 'NP';

        [$jurisdiction, $taxClass, $taxRate] = $this->findOrCreateRate(
            $country,
            $name,
            (float) $rate,
            'both',
        );

        $settings->sales_tax_enabled              = true;
        $settings->purchase_tax_enabled           = true;
        $settings->default_sales_tax_rate_id      = $taxRate->id;
        $settings->default_purchase_tax_rate_id   = $taxRate->id;
        $settings->sales_tax_name                 = $name;
        $settings->purchase_tax_name              = $name;
        $settings->sales_tax_rate_percent         = $rate;
        $settings->purchase_tax_rate_percent      = $rate;
        $settings->preset                         = 'standard_vat';
        $settings->wizard_completed               = true;
        $settings->save();

        $this->maybeCreateRegistration($settings, $jurisdiction);
    }

    private function applySalesTaxOnly(TaxSettings $settings): void
    {
        $rate    = $settings->sales_tax_rate_percent ?: 13;
        $name    = $settings->sales_tax_name ?: 'VAT';
        $country = $settings->country_code ?: 'NP';

        [, , $taxRate] = $this->findOrCreateRate($country, $name, (float) $rate, 'sale');

        $settings->sales_tax_enabled             = true;
        $settings->purchase_tax_enabled          = false;
        $settings->default_sales_tax_rate_id     = $taxRate->id;
        $settings->default_purchase_tax_rate_id  = null;
        $settings->sales_tax_name                = $name;
        $settings->sales_tax_rate_percent        = $rate;
        $settings->preset                        = 'sales_tax_only';
        $settings->wizard_completed              = true;
        $settings->save();
    }

    private function applyPurchaseSalesVat(TaxSettings $settings): void
    {
        $salesRate    = $settings->sales_tax_rate_percent ?: 13;
        $purchaseRate = $settings->purchase_tax_rate_percent ?: $salesRate;
        $name         = $settings->sales_tax_name ?: 'VAT';
        $country      = $settings->country_code ?: 'NP';

        [$jurisdiction, , $salesTaxRate]    = $this->findOrCreateRate($country, $name, (float) $salesRate, 'sale');
        [, , $purchaseTaxRate] = $this->findOrCreateRate($country, $name, (float) $purchaseRate, 'purchase');

        $settings->sales_tax_enabled             = true;
        $settings->purchase_tax_enabled          = true;
        $settings->default_sales_tax_rate_id     = $salesTaxRate->id;
        $settings->default_purchase_tax_rate_id  = $purchaseTaxRate->id;
        $settings->sales_tax_name                = $name;
        $settings->purchase_tax_name             = $name;
        $settings->sales_tax_rate_percent        = $salesRate;
        $settings->purchase_tax_rate_percent     = $purchaseRate;
        $settings->preset                        = 'purchase_sales_vat';
        $settings->wizard_completed              = true;
        $settings->save();

        $this->maybeCreateRegistration($settings, $jurisdiction);
    }

    /**
     * Find or create: TaxJurisdiction → TaxClass → TaxRate.
     *
     * @return array{TaxJurisdiction, TaxClass, TaxRate}
     */
    private function findOrCreateRate(
        string $country,
        string $name,
        float  $ratePercent,
        string $appliesOn,
    ): array {
        $taxSystem = match ($country) {
            'IN'    => 'india_gst',
            'US'    => 'usa_sales_tax',
            default => 'nepal_vat',
        };

        $jurisdiction = TaxJurisdiction::firstOrCreate(
            ['country_code' => $country, 'tax_system' => $taxSystem],
            [
                'name'   => "$country - $name",
                'code'   => strtoupper("{$country}-{$name}"),
                'active' => true,
            ]
        );

        $taxClass = TaxClass::firstOrCreate(
            ['code' => strtoupper($name), 'tax_jurisdiction_id' => $jurisdiction->id],
            [
                'name'                => $name,
                'country_code'        => $country,
                'tax_type'            => 'vat',
                'tax_behavior'        => 'standard',
                'active'              => true,
                'is_system_generated' => true,
            ]
        );

        $rateCode = strtoupper("{$name}" . (int) $ratePercent);
        $taxRate  = TaxRate::firstOrCreate(
            [
                'code'             => $rateCode,
                'tax_class_id'     => $taxClass->id,
                'tax_jurisdiction_id' => $jurisdiction->id,
            ],
            [
                'name'               => "$name {$ratePercent}%",
                'country_code'       => $country,
                'tax_type'           => 'vat',
                'rate_percent'       => $ratePercent,
                'inclusive'          => false,
                'calculation_method' => 'single',
                'applies_on'         => $appliesOn,
                'active'             => true,
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
                'registration_no'      => $settings->tax_number,
                'tax_jurisdiction_id'  => $jurisdiction->id,
            ],
            [
                'registration_type' => $settings->registration_type ?? 'vat',
                'legal_name'        => $settings->tax_registered_name,
                'effective_from'    => $settings->registration_effective_date,
                'active'            => true,
                'is_system_generated' => true,
            ]
        );
    }
}
