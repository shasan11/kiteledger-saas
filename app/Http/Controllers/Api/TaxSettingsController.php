<?php

namespace App\Http\Controllers\Api;

use App\Models\TaxSettings;
use App\Services\Tax\TaxPresetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class TaxSettingsController extends Controller
{
    public function __construct(protected TaxPresetService $presetService) {}

    /**
     * Return current tax settings (create defaults if none exist).
     */
    public function show(): JsonResponse
    {
        $settings = TaxSettings::with([
            'defaultSalesTaxRate',
            'defaultPurchaseTaxRate',
            'salesTaxAccount',
            'salesTaxPayableAccount',
            'purchaseTaxAccount',
        ])->first();

        if (! $settings) {
            $settings = new TaxSettings();
        }

        return response()->json(['data' => $this->format($settings)]);
    }

    /**
     * Save (upsert) tax settings and optionally apply a preset.
     */
    public function upsert(Request $request): JsonResponse
    {
        $data = $request->validate([
            'branch_id'                    => ['nullable', 'integer'],
            'enable_tax'                   => ['nullable', 'boolean'],
            'is_tax_registered'            => ['nullable', 'boolean'],
            'registration_type'            => ['nullable', 'string', 'max:30'],
            'tax_label'                    => ['nullable', 'in:VAT,GST,Tax,Custom'],
            'custom_tax_label'             => ['nullable', 'string', 'max:60'],
            'tax_number'                   => ['nullable', 'string', 'max:80'],
            'company_tax_number'           => ['nullable', 'string', 'max:80'],
            'tax_registered_name'          => ['nullable', 'string', 'max:180'],
            'country_code'                 => ['nullable', 'string', 'size:2'],
            'default_currency'             => ['nullable', 'string', 'max:10'],
            'registration_effective_date'  => ['nullable', 'date'],
            'sales_tax_enabled'            => ['nullable', 'boolean'],
            'sales_tax_name'               => ['nullable', 'string', 'max:80'],
            'sales_tax_rate_percent'       => ['nullable', 'numeric', 'min:0', 'max:100'],
            'default_sales_tax_rate_id'    => ['nullable', 'uuid', 'exists:tax_rates,id'],
            'default_sales_tax_id'         => ['nullable', 'uuid', 'exists:tax_rates,id'],
            'sales_tax_account_id'         => ['nullable', 'integer'],
            'sales_tax_payable_account_id' => ['nullable', 'integer'],
            'purchase_tax_enabled'         => ['nullable', 'boolean'],
            'purchase_tax_name'            => ['nullable', 'string', 'max:80'],
            'purchase_tax_rate_percent'    => ['nullable', 'numeric', 'min:0', 'max:100'],
            'default_purchase_tax_rate_id' => ['nullable', 'uuid', 'exists:tax_rates,id'],
            'default_purchase_tax_id'      => ['nullable', 'uuid', 'exists:tax_rates,id'],
            'default_tax_rate_id'          => ['nullable', 'uuid', 'exists:tax_rates,id'],
            'tax_calculation_type'         => ['nullable', 'in:exclusive,inclusive'],
            'tax_rounding_method'          => ['nullable', 'in:document,line'],
            'show_tax_on_invoice'          => ['nullable', 'boolean'],
            'sales_tax_calculation_type'   => ['nullable', 'in:global,inclusive,exclusive'],
            'purchase_tax_calculation_type' => ['nullable', 'in:global,inclusive,exclusive'],
            'allow_sales_tax_override'     => ['nullable', 'boolean'],
            'allow_purchase_tax_override'  => ['nullable', 'boolean'],
            'show_tax_summary_on_bill'     => ['nullable', 'boolean'],
            'purchase_tax_recoverable'     => ['nullable', 'boolean'],
            'purchase_tax_account_id'      => ['nullable', 'integer'],
            'product_tax_behavior'         => ['nullable', 'in:all_same,some_exempt,some_different'],
            'advanced_mode'                => ['nullable', 'boolean'],
            'preset'                       => ['nullable', 'string', 'max:30'],
            'wizard_completed'             => ['nullable', 'boolean'],
        ]);

        // Validation: tax number required when registered
        if (! empty($data['is_tax_registered']) && empty($data['tax_number']) && empty($data['company_tax_number'])) {
            return response()->json([
                'message' => 'Tax number is required when your business is tax registered.',
                'errors'  => ['tax_number' => ['Tax number is required when registered.']],
            ], 422);
        }

        $data = $this->normalizeSimplePayload($data);

        $settings = TaxSettings::firstOrNew([]);
        $settings->fill($data);
        $settings->save();

        // Apply preset if requested
        $preset = $data['preset'] ?? null;
        if ($preset && $preset !== 'none' && $preset !== 'custom') {
            $this->presetService->apply($settings, $preset);
            $settings->refresh();
        }

        $settings->load([
            'defaultSalesTaxRate',
            'defaultPurchaseTaxRate',
            'salesTaxAccount',
            'salesTaxPayableAccount',
            'purchaseTaxAccount',
        ]);

        return response()->json(['data' => $this->format($settings)]);
    }

    /**
     * Toggle advanced mode on/off.
     */
    public function toggleAdvancedMode(Request $request): JsonResponse
    {
        $settings = TaxSettings::firstOrNew([]);
        $settings->advanced_mode = ! $settings->advanced_mode;
        $settings->save();

        return response()->json([
            'data'          => $this->format($settings),
            'advanced_mode' => $settings->advanced_mode,
        ]);
    }

    private function format(TaxSettings $s): array
    {
        $enabled = (bool) ($s->sales_tax_enabled || $s->purchase_tax_enabled);
        $storedLabel = $s->tax_label ?: ($s->sales_tax_name ?: 'VAT');
        $taxLabel = in_array($storedLabel, ['VAT', 'GST', 'Tax', 'Custom'], true) ? $storedLabel : 'Custom';
        $customTaxLabel = $s->custom_tax_label ?: ($taxLabel === 'Custom' ? $storedLabel : null);
        $defaultTaxRateId = $s->default_sales_tax_rate_id ?: $s->default_purchase_tax_rate_id;

        return [
            'id'                           => $s->id,
            'branch_id'                    => $s->branch_id,
            'enable_tax'                   => $enabled,
            'is_tax_registered'            => (bool) $s->is_tax_registered,
            'registration_type'            => $s->registration_type,
            'tax_label'                    => $taxLabel,
            'custom_tax_label'             => $customTaxLabel,
            'tax_number'                   => $s->tax_number,
            'company_tax_number'           => $s->tax_number,
            'tax_registered_name'          => $s->tax_registered_name,
            'country_code'                 => $s->country_code ?? 'NP',
            'default_currency'             => $s->default_currency ?? 'NPR',
            'registration_effective_date'  => $s->registration_effective_date?->format('Y-m-d'),
            'default_tax_rate_id'          => $defaultTaxRateId,
            'sales_tax_enabled'            => (bool) $s->sales_tax_enabled,
            'sales_tax_name'               => $s->sales_tax_name ?? 'VAT',
            'sales_tax_rate_percent'       => (float) ($s->sales_tax_rate_percent ?? 0),
            'default_sales_tax_rate_id'    => $s->default_sales_tax_rate_id,
            'default_sales_tax_id'         => $s->default_sales_tax_rate_id,
            'default_sales_tax_rate'       => $s->defaultSalesTaxRate
                ? ['id' => $s->defaultSalesTaxRate->id, 'name' => $s->defaultSalesTaxRate->name, 'rate_percent' => $s->defaultSalesTaxRate->rate_percent, 'inclusive' => $s->defaultSalesTaxRate->inclusive, 'tax_jurisdiction_id' => $s->defaultSalesTaxRate->tax_jurisdiction_id]
                : null,
            'sales_tax_account_id'         => $s->sales_tax_account_id,
            'sales_tax_account'            => $s->salesTaxAccount
                ? ['id' => $s->salesTaxAccount->id, 'name' => $s->salesTaxAccount->name]
                : null,
            'sales_tax_payable_account_id' => $s->sales_tax_payable_account_id,
            'sales_tax_payable_account'    => $s->salesTaxPayableAccount
                ? ['id' => $s->salesTaxPayableAccount->id, 'name' => $s->salesTaxPayableAccount->name]
                : null,
            'purchase_tax_enabled'         => (bool) $s->purchase_tax_enabled,
            'purchase_tax_name'            => $s->purchase_tax_name ?? 'VAT',
            'purchase_tax_rate_percent'    => (float) ($s->purchase_tax_rate_percent ?? 0),
            'default_purchase_tax_rate_id' => $s->default_purchase_tax_rate_id,
            'default_purchase_tax_id'      => $s->default_purchase_tax_rate_id,
            'default_purchase_tax_rate'    => $s->defaultPurchaseTaxRate
                ? ['id' => $s->defaultPurchaseTaxRate->id, 'name' => $s->defaultPurchaseTaxRate->name, 'rate_percent' => $s->defaultPurchaseTaxRate->rate_percent, 'inclusive' => $s->defaultPurchaseTaxRate->inclusive, 'tax_jurisdiction_id' => $s->defaultPurchaseTaxRate->tax_jurisdiction_id]
                : null,
            'tax_calculation_type'         => $s->tax_calculation_type ?? 'exclusive',
            'tax_rounding_method'          => $s->tax_rounding_method ?? 'document',
            'show_tax_on_invoice'          => (bool) ($s->show_tax_on_invoice ?? true),
            'sales_tax_calculation_type'   => $s->sales_tax_calculation_type ?? 'global',
            'purchase_tax_calculation_type' => $s->purchase_tax_calculation_type ?? 'global',
            'allow_sales_tax_override'     => (bool) ($s->allow_sales_tax_override ?? true),
            'allow_purchase_tax_override'  => (bool) ($s->allow_purchase_tax_override ?? true),
            'show_tax_summary_on_bill'     => (bool) ($s->show_tax_summary_on_bill ?? true),
            'purchase_tax_recoverable'     => (bool) ($s->purchase_tax_recoverable ?? true),
            'purchase_tax_account_id'      => $s->purchase_tax_account_id,
            'purchase_tax_account'         => $s->purchaseTaxAccount
                ? ['id' => $s->purchaseTaxAccount->id, 'name' => $s->purchaseTaxAccount->name]
                : null,
            'product_tax_behavior'         => $s->product_tax_behavior ?? 'all_same',
            'advanced_mode'                => (bool) $s->advanced_mode,
            'preset'                       => $s->preset ?? 'none',
            'wizard_completed'             => (bool) $s->wizard_completed,
            'created_at'                   => $s->created_at?->toISOString(),
            'updated_at'                   => $s->updated_at?->toISOString(),
        ];
    }

    private function normalizeSimplePayload(array $data): array
    {
        if (array_key_exists('enable_tax', $data)) {
            $data['sales_tax_enabled'] = $data['enable_tax'];
            $data['purchase_tax_enabled'] = $data['enable_tax'];
            unset($data['enable_tax']);
        }

        if (array_key_exists('company_tax_number', $data)) {
            $data['tax_number'] = $data['company_tax_number'];
            unset($data['company_tax_number']);
        }

        if (! empty($data['default_tax_rate_id'])) {
            $data['default_sales_tax_rate_id'] ??= $data['default_tax_rate_id'];
            $data['default_purchase_tax_rate_id'] ??= $data['default_tax_rate_id'];
            unset($data['default_tax_rate_id']);
        }

        if (! empty($data['default_sales_tax_id'])) {
            $data['default_sales_tax_rate_id'] = $data['default_sales_tax_id'];
            unset($data['default_sales_tax_id']);
        }

        if (! empty($data['default_purchase_tax_id'])) {
            $data['default_purchase_tax_rate_id'] = $data['default_purchase_tax_id'];
            unset($data['default_purchase_tax_id']);
        }

        $label = $data['tax_label'] ?? null;
        $displayLabel = $label === 'Custom'
            ? ($data['custom_tax_label'] ?? 'Tax')
            : $label;

        if ($displayLabel) {
            $data['sales_tax_name'] ??= $displayLabel;
            $data['purchase_tax_name'] ??= $displayLabel;
        }

        return $data;
    }
}
