<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Jobs\SaaS\ProcessBillingWebhookJob;
use App\Models\Central\BillingWebhookEvent;
use App\Models\Central\PaymentGateway;
use App\Models\Central\PaymentTransaction;
use App\Models\Central\TenantInvoice;
use App\Services\Payments\PaymentManager;
use App\Services\Payments\PayPalGatewayService;
use App\Services\SaaS\InvoiceCompliancePresenter;
use App\Services\SaaS\PlatformSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SaaSInvoicePaymentController extends Controller
{
    public function show(Request $request, TenantInvoice $invoice, PlatformSettingsService $settings, InvoiceCompliancePresenter $compliance)
    {
        abort_if($invoice->status === 'void', 404);
        $invoice->load(['tenant:id,company_name,legal_name,owner_email,owner_phone,address,country', 'lines']);
        $active = PaymentGateway::where('is_active', true)->orderBy('sort_order')->get();
        $gateways = $active
            ->filter(fn (PaymentGateway $gateway): bool => in_array(strtoupper($invoice->currency), array_map('strtoupper', $gateway->supported_currencies ?? []), true))
            ->map(fn (PaymentGateway $gateway): array => ['slug' => $gateway->slug, 'name' => $gateway->name, 'manual' => $gateway->slug === 'manual', 'instructions' => $gateway->slug === 'manual' ? data_get($gateway->safe_config, 'instructions') : null])
            ->values();

        return Inertia::render('Central/Billing/PublicInvoice', [
            'invoice' => $invoice, 'gateways' => $gateways,
            // Distinguishes "nothing switched on" from "switched on, wrong currency",
            // which are very different problems for whoever has to fix it.
            'gatewayNotice' => $gateways->isNotEmpty() ? null : ($active->isEmpty()
                ? 'No payment provider has been enabled yet. Contact the billing team to arrange payment.'
                : 'No enabled payment provider accepts '.strtoupper($invoice->currency).'. Contact the billing team to arrange payment.'),
            'document' => $this->invoiceDocument($invoice, $settings),
            'compliance' => $compliance->present($invoice),
            'checkoutUrl' => URL::signedRoute('central.billing.invoice.checkout', ['invoice' => $invoice->id]),
            'showUrl' => URL::signedRoute('central.billing.invoice.show', ['invoice' => $invoice->id]),
            'processingUrl' => URL::signedRoute('central.billing.invoice.show', ['invoice' => $invoice->id, 'state' => 'processing']),
            'state' => $request->string('state')->toString(),
        ]);
    }

    /**
     * A stable, presentation-ready invoice identity. Historical invoice
     * snapshots win; current platform settings only fill gaps on older rows.
     *
     * @return array<string, mixed>
     */
    private function invoiceDocument(TenantInvoice $invoice, PlatformSettingsService $settings): array
    {
        $seller = $invoice->seller_snapshot ?? [];
        $buyer = $invoice->buyer_snapshot ?? $invoice->billing_identity ?? [];
        $custom = $invoice->customization_snapshot ?? [];
        $tenant = $invoice->tenant;

        $sellerAddress = $this->firstFilled(
            data_get($seller, 'invoice_customization.company_address'),
            data_get($seller, 'company.address'),
            data_get($seller, 'company.address_line_1'),
            $settings->get('invoice_customization.company_address'),
            $settings->get('company.address_line_1'),
        );
        $sellerLocality = collect([
            data_get($seller, 'company.address_line_2', $settings->get('company.address_line_2')),
            data_get($seller, 'company.city', $settings->get('company.city')),
            data_get($seller, 'company.state', $settings->get('company.state')),
            data_get($seller, 'company.postal_code', $settings->get('company.postal_code')),
        ])->filter(fn ($value) => filled($value))->implode(', ');

        $logo = $this->firstFilled(
            data_get($seller, 'invoice_customization.invoice_logo'),
            data_get($seller, 'branding.invoice_logo'),
            data_get($custom, 'invoice_customization.invoice_logo'),
            $settings->get('invoice_customization.invoice_logo'),
            $settings->get('branding.invoice_logo'),
            $settings->get('branding.light_logo'),
        );

        return [
            'seller' => [
                'name' => $this->firstFilled(data_get($seller, 'invoice_customization.company_legal_name'), data_get($seller, 'company.legal_company_name'), $settings->get('invoice_customization.company_legal_name'), $settings->get('company.legal_company_name'), $settings->get('general.legal_platform_name'), $settings->get('general.platform_name'), 'KiteLedger'),
                'logo_url' => $this->assetUrl($logo),
                'address_lines' => collect([$sellerAddress, $sellerLocality, data_get($seller, 'company.country', $settings->get('company.country'))])->filter(fn ($value) => filled($value))->values()->all(),
                'email' => $this->firstFilled(data_get($seller, 'invoice_customization.email'), data_get($seller, 'company.email'), $settings->get('invoice_customization.email'), $settings->get('company.email')),
                'phone' => $this->firstFilled(data_get($seller, 'invoice_customization.phone'), data_get($seller, 'company.phone'), $settings->get('invoice_customization.phone'), $settings->get('company.phone')),
                'website' => $this->firstFilled(data_get($seller, 'company.website'), $settings->get('company.website')),
                'tax_number' => $this->firstFilled(data_get($seller, 'invoice_customization.tax_number'), data_get($seller, 'company.tax_number'), $settings->get('invoice_customization.tax_number'), $settings->get('company.tax_number')),
                'registration_number' => $this->firstFilled(data_get($seller, 'invoice_customization.registration_number'), data_get($seller, 'company.registration_number'), $settings->get('invoice_customization.registration_number'), $settings->get('company.registration_number')),
            ],
            'buyer' => [
                'name' => $this->firstFilled(data_get($buyer, 'legal_name'), data_get($buyer, 'company_name'), data_get($buyer, 'name'), $tenant?->legal_name, $tenant?->company_name, 'Customer'),
                'address_lines' => collect([$this->firstFilled(data_get($buyer, 'billing_address'), data_get($buyer, 'address'), data_get($buyer, 'address_line_1'), $tenant?->address), data_get($buyer, 'address_line_2'), data_get($buyer, 'country', $tenant?->country)])->filter(fn ($value) => filled($value))->values()->all(),
                'email' => $this->firstFilled(data_get($buyer, 'billing_email'), data_get($buyer, 'email'), $tenant?->owner_email),
                'phone' => $this->firstFilled(data_get($buyer, 'phone'), $tenant?->owner_phone),
                'tax_number' => $this->firstFilled(data_get($buyer, 'tax_number'), data_get($buyer, 'vat_number'), data_get($buyer, 'pan_or_vat')),
            ],
            'payment_terms' => $this->firstFilled(data_get($custom, 'invoice_customization.payment_terms'), data_get($seller, 'invoice_customization.payment_terms'), $settings->get('invoice_customization.payment_terms')),
            'bank_details' => $this->firstFilled(data_get($custom, 'invoice_customization.bank_details'), data_get($seller, 'invoice_customization.bank_details'), $settings->get('invoice_customization.bank_details')),
            'payment_instructions' => $this->firstFilled(data_get($custom, 'invoice_customization.payment_instructions'), data_get($seller, 'invoice_customization.payment_instructions'), $settings->get('invoice_customization.payment_instructions')),
            'footer' => $this->firstFilled(data_get($custom, 'invoice_customization.footer'), data_get($seller, 'invoice_customization.footer'), $settings->get('invoice_customization.footer'), $settings->get('billing.invoice_footer')),
            'tax_label' => $this->firstFilled(data_get($custom, 'invoice_customization.tax_label'), data_get($seller, 'invoice_customization.tax_label'), $settings->get('invoice_customization.tax_label'), $settings->get('billing.tax_name'), 'Tax'),
        ];
    }

    private function firstFilled(mixed ...$values): mixed
    {
        foreach ($values as $value) {
            if (filled($value)) {
                return $value;
            }
        }

        return null;
    }

    private function assetUrl(mixed $value): ?string
    {
        if (! is_string($value) || blank($value)) {
            return null;
        }

        return Str::startsWith($value, ['http://', 'https://', 'data:', '//']) ? $value : asset(ltrim($value, '/'));
    }

    public function checkout(Request $request, TenantInvoice $invoice, PaymentManager $payments)
    {
        $data = $request->validate(['gateway' => ['required', Rule::in(['stripe', 'paypal', 'razorpay'])]]);
        $invoice->refresh();
        abort_if(in_array($invoice->status, ['paid', 'void'], true) || (float) $invoice->balance <= 0, 409, 'This invoice no longer has an outstanding balance.');
        $gateway = PaymentGateway::where('slug', $data['gateway'])->where('is_active', true)->firstOrFail();
        abort_unless(in_array(strtoupper($invoice->currency), array_map('strtoupper', $gateway->supported_currencies ?? []), true), 422, 'This gateway does not support the invoice currency.');
        $checkoutKey = (string) Str::uuid();
        $showUrl = URL::signedRoute('central.billing.invoice.show', ['invoice' => $invoice->id]);
        $successUrl = $data['gateway'] === 'paypal' ? route('central.billing.invoice.paypal.complete', ['invoice' => $invoice->id, 'checkout' => $checkoutKey]) : URL::signedRoute('central.billing.invoice.show', ['invoice' => $invoice->id, 'state' => 'success']);
        $cancelUrl = URL::signedRoute('central.billing.invoice.show', ['invoice' => $invoice->id, 'state' => 'cancelled']);
        $result = $payments->driver($data['gateway'])->createPayment($invoice, ['success_url' => $successUrl, 'cancel_url' => $cancelUrl]);
        PaymentTransaction::create(['tenant_id' => $invoice->tenant_id, 'invoice_id' => $invoice->id, 'gateway' => $data['gateway'], 'gateway_transaction_id' => $result['transaction_id'] ?? null, 'amount' => $invoice->balance, 'currency' => $invoice->currency, 'status' => 'pending', 'payment_method' => $data['gateway'], 'idempotency_key' => $checkoutKey, 'raw_response' => ['provider_reference' => $result['transaction_id'] ?? null]]);

        return response()->json($result + ['show_url' => $showUrl, 'amount' => (float) $invoice->balance, 'currency' => $invoice->currency, 'invoice_number' => $invoice->invoice_number]);
    }

    public function completePayPal(Request $request, TenantInvoice $invoice, PaymentManager $payments)
    {
        $pending = PaymentTransaction::where('invoice_id', $invoice->id)->where('gateway', 'paypal')->where('idempotency_key', $request->string('checkout'))->firstOrFail();
        $orderId = $request->string('token')->toString();
        abort_unless($orderId && hash_equals((string) $pending->gateway_transaction_id, $orderId), 403);
        $driver = $payments->driver('paypal');
        abort_unless($driver instanceof PayPalGatewayService, 500);
        $captureResponse = $driver->captureOrder($orderId);
        $capture = data_get($captureResponse, 'purchase_units.0.payments.captures.0');
        abort_unless(is_array($capture), 502, 'PayPal did not return a completed capture.');
        $capture['custom_id'] = (string) $invoice->id;
        $event = BillingWebhookEvent::firstOrCreate(['event_id' => 'paypal:internal:'.data_get($capture, 'id')], ['gateway' => 'paypal', 'event_type' => 'PAYMENT.CAPTURE.COMPLETED', 'payload' => ['resource' => $capture], 'status' => 'pending']);
        if ($event->wasRecentlyCreated) {
            dispatch_sync(new ProcessBillingWebhookJob($event->id));
        }

        return redirect(URL::signedRoute('central.billing.invoice.show', ['invoice' => $invoice->id, 'state' => 'success']));
    }
}
