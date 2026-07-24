<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\PlatformSetting;
use App\Models\Central\TenantInvoice;
use App\Services\SaaS\CentralAuditService;
use App\Services\SaaS\InvoiceNumberService;
use App\Services\SaaS\PlatformSettingsService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class InvoiceCustomizationController extends Controller
{
    private const FIELDS = [
        'invoice_logo', 'accent_color', 'safe_font_selection', 'company_legal_name', 'company_address', 'email', 'phone', 'tax_number', 'registration_number',
        'prefix', 'suffix', 'starting_number', 'minimum_digits', 'annual_reset', 'invoice_title', 'payment_terms', 'notes', 'footer', 'bank_details',
        'payment_instructions', 'authorized_signatory', 'signature', 'paid_stamp', 'qr_code', 'show_plan', 'show_subscription_period', 'show_tax',
        'show_discount', 'show_payment_history', 'show_balance', 'show_billing_address', 'show_tenant_tax_number', 'show_metadata', 'language', 'date_format',
        'number_format', 'currency_format', 'tax_label', 'due_date_label',
    ];

    public function index()
    {
        return Inertia::render('Central/Billing/InvoiceCustomization', [
            'values' => PlatformSetting::where('group', 'invoice_customization')->orderBy('sort_order')->get()->mapWithKeys(fn (PlatformSetting $setting) => [str($setting->key)->after('invoice_customization.')->toString() => $setting->safeValue()])->all(),
            'updatedAt' => PlatformSetting::where('group', 'invoice_customization')->max('updated_at'),
        ]);
    }

    public function update(Request $request, PlatformSettingsService $settings, CentralAuditService $audit)
    {
        $values = $request->validate(['values' => ['required', 'array:'.implode(',', self::FIELDS)]])['values'];
        $rules = [
            'accent_color' => ['sometimes', 'nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'safe_font_selection' => ['sometimes', 'nullable', Rule::in(['DejaVu Sans', 'Helvetica', 'Times New Roman'])],
            'starting_number' => ['sometimes', 'nullable', 'integer', 'min:1'], 'minimum_digits' => ['sometimes', 'nullable', 'integer', 'between:1,12'],
            'email' => ['sometimes', 'nullable', 'email'], 'language' => ['sometimes', 'nullable', Rule::in(['en', 'de', 'es', 'fr', 'pt', 'ne'])],
            'date_format' => ['sometimes', 'nullable', Rule::in(['Y-m-d', 'd/m/Y', 'm/d/Y', 'M j, Y'])],
            'number_format' => ['sometimes', 'nullable', Rule::in(['1,234.56', '1.234,56', '1 234,56'])],
            'currency_format' => ['sometimes', 'nullable', Rule::in(['code', 'symbol'])],
            'invoice_logo' => ['sometimes', 'nullable', 'string', 'max:2048'], 'signature' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'paid_stamp' => ['sometimes', 'nullable', 'string', 'max:2048'], 'footer' => ['sometimes', 'nullable', 'string', 'max:50000'],
        ];
        foreach (['annual_reset', 'qr_code', 'show_plan', 'show_subscription_period', 'show_tax', 'show_discount', 'show_payment_history', 'show_balance', 'show_billing_address', 'show_tenant_tax_number', 'show_metadata'] as $field) {
            $rules[$field] = ['sometimes', 'boolean'];
        }
        foreach (array_diff(self::FIELDS, array_keys($rules), ['starting_number', 'minimum_digits']) as $field) {
            $rules[$field] = ['sometimes', 'nullable', 'string', 'max:10000'];
        }
        validator($values, $rules)->validate();
        $payload = collect($values)->mapWithKeys(fn ($value, $key) => ['invoice_customization.'.$key => $value])->all();
        $settings->updateSection('invoice_customization', $payload, $request->user('central')->id, $request->ip());
        $audit->log($request, 'invoice.customization_updated', null, [], ['keys' => array_keys($payload)]);

        return back()->with('success', 'Invoice customization saved.');
    }

    public function testPdf()
    {
        $invoice = $this->sampleInvoice();

        return Pdf::loadView('central.invoice', compact('invoice'))->setPaper('a4')->stream('kiteledger-invoice-preview.pdf');
    }

    public function emailPreview()
    {
        return view('central.invoice-email-preview', ['invoice' => $this->sampleInvoice()]);
    }

    private function sampleInvoice(): TenantInvoice
    {
        $snapshot = [];
        PlatformSetting::where('group', 'invoice_customization')->get()->each(fn (PlatformSetting $setting) => Arr::set($snapshot, $setting->key, $setting->safeValue()));
        $seller = $snapshot;
        Arr::set($seller, 'company.legal_company_name', data_get($snapshot, 'invoice_customization.company_legal_name', 'KiteLedger Ltd.'));
        Arr::set($seller, 'company.address_line_1', data_get($snapshot, 'invoice_customization.company_address', '123 Finance Avenue'));
        Arr::set($seller, 'company.email', data_get($snapshot, 'invoice_customization.email', 'billing@example.test'));
        $invoice = new TenantInvoice([
            'invoice_number' => app(InvoiceNumberService::class)->preview($snapshot), 'issue_date' => today(), 'due_date' => today()->addDays(14),
            'subtotal' => 1250, 'discount' => 50, 'tax' => 120, 'total' => 1320, 'paid_amount' => 320, 'balance' => 1000, 'currency' => 'USD', 'status' => 'partially_paid',
            'seller_snapshot' => $seller, 'buyer_snapshot' => ['legal_name' => 'Acme Trading Company', 'address' => '88 Market Street', 'email' => 'accounts@acme.example', 'tax_number' => 'TAX-88310'],
            'customization_snapshot' => $snapshot, 'tax_snapshot' => ['rate' => 10],
            'line_items_snapshot' => [
                ['type' => 'plan', 'description' => 'KiteLedger Professional — annual subscription', 'quantity' => 1, 'unit_amount' => 1100, 'amount' => 1100],
                ['type' => 'capacity', 'description' => 'Additional branch capacity', 'quantity' => 3, 'unit_amount' => 50, 'amount' => 150],
            ],
            'notes' => 'Thank you for choosing KiteLedger.',
        ]);
        $invoice->setRelation('lines', collect());
        $invoice->setRelation('payments', collect());

        return $invoice;
    }
}
