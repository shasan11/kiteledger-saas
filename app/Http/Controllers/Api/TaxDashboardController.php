<?php

namespace App\Http\Controllers\Api;

use App\Models\Invoice;
use App\Models\PurchaseBill;
use App\Models\TaxReportTemplate;
use App\Models\TaxSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxDashboardController extends \App\Http\Controllers\Controller
{
    public function summary(Request $request): JsonResponse
    {
        $request->validate([
            'date_from'    => ['nullable', 'date'],
            'date_to'      => ['nullable', 'date'],
            'country_code' => ['nullable', 'string', 'size:2'],
        ]);

        $dateFrom = $request->input('date_from', now()->startOfMonth()->toDateString());
        $dateTo   = $request->input('date_to',   now()->endOfMonth()->toDateString());

        $settings = TaxSettings::first();

        $outputTax = (float) Invoice::query()
            ->whereBetween('invoice_date', [$dateFrom, $dateTo])
            ->join('invoice_lines', 'invoices.id', '=', 'invoice_lines.invoice_id')
            ->sum('invoice_lines.tax_amount');

        $inputTax = (float) PurchaseBill::query()
            ->whereBetween('bill_date', [$dateFrom, $dateTo])
            ->join('purchase_bill_lines', 'purchase_bills.id', '=', 'purchase_bill_lines.purchase_bill_id')
            ->sum('purchase_bill_lines.tax_amount');

        // Taxable base = line_total minus the tax portion for lines that carried tax
        $taxableSales = (float) Invoice::query()
            ->whereBetween('invoice_date', [$dateFrom, $dateTo])
            ->join('invoice_lines', 'invoices.id', '=', 'invoice_lines.invoice_id')
            ->whereNotNull('invoice_lines.tax_rate_id')
            ->selectRaw('SUM(invoice_lines.line_total - invoice_lines.tax_amount) as total')
            ->value('total');

        $taxablePurchases = (float) PurchaseBill::query()
            ->whereBetween('bill_date', [$dateFrom, $dateTo])
            ->join('purchase_bill_lines', 'purchase_bills.id', '=', 'purchase_bill_lines.purchase_bill_id')
            ->whereNotNull('purchase_bill_lines.tax_rate_id')
            ->selectRaw('SUM(purchase_bill_lines.line_total - purchase_bill_lines.tax_amount) as total')
            ->value('total');

        // Exempt/zero-rated = lines with no tax rate, use the full line_total
        $exemptSales = (float) Invoice::query()
            ->whereBetween('invoice_date', [$dateFrom, $dateTo])
            ->join('invoice_lines', 'invoices.id', '=', 'invoice_lines.invoice_id')
            ->whereNull('invoice_lines.tax_rate_id')
            ->sum('invoice_lines.line_total');

        $countryCode = $request->input('country_code') ?? $settings?->country_code ?? 'NP';

        $availableReports = TaxReportTemplate::where('country_code', $countryCode)
            ->where('active', true)
            ->orderBy('report_key')
            ->get(['report_key', 'report_name'])
            ->toArray();

        $taxHealth = [
            'setup_completed'            => (bool) $settings?->wizard_completed,
            'sales_tax_enabled'          => (bool) $settings?->sales_tax_enabled,
            'purchase_tax_enabled'       => (bool) $settings?->purchase_tax_enabled,
            'tax_registration_present'   => (bool) $settings?->is_tax_registered,
            'tax_accounts_linked'        => (bool) $settings?->sales_tax_account_id,
            'filing_schedule_configured' => false,
        ];

        return response()->json([
            'output_tax'         => round($outputTax, 2),
            'input_tax'          => round($inputTax, 2),
            'net_tax'            => round($outputTax - $inputTax, 2),
            'taxable_sales'      => round($taxableSales, 2),
            'taxable_purchases'  => round($taxablePurchases, 2),
            'exempt_sales'       => round($exemptSales, 2),
            'available_reports'  => $availableReports,
            'tax_health'         => $taxHealth,
            'period'             => ['date_from' => $dateFrom, 'date_to' => $dateTo],
            'country_code'       => $countryCode,
            'currency'           => $settings?->default_currency ?? 'NPR',
        ]);
    }

    public function countryOptions(): JsonResponse
    {
        $presets = config('tax_presets', []);

        $countries = [
            'NP' => 'Nepal',
            'IN' => 'India',
            'US' => 'United States',
            'GB' => 'United Kingdom',
            'FR' => 'France',
            'AE' => 'United Arab Emirates',
            'AU' => 'Australia',
            'CA' => 'Canada',
            'SG' => 'Singapore',
            'DE' => 'Germany',
            'JP' => 'Japan',
            'KR' => 'South Korea',
            'BR' => 'Brazil',
            'ZA' => 'South Africa',
            'MX' => 'Mexico',
            'NZ' => 'New Zealand',
            'TH' => 'Thailand',
            'MY' => 'Malaysia',
            'ID' => 'Indonesia',
            'PH' => 'Philippines',
        ];

        $options = [];
        foreach ($countries as $code => $label) {
            $preset = $presets[$code] ?? null;
            $options[] = [
                'value'        => $code,
                'label'        => $label,
                'currency'     => $preset['currency'] ?? null,
                'has_preset'   => isset($preset),
                'tax_name'     => $preset['tax_name'] ?? null,
                'default_rate' => $preset['default_rate'] ?? null,
            ];
        }

        return response()->json($options);
    }
}
