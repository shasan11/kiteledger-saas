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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SaaSInvoicePaymentController extends Controller
{
    public function show(Request $request, TenantInvoice $invoice)
    {
        abort_if($invoice->status === 'void', 404);
        $invoice->load(['tenant:id,company_name,legal_name', 'lines']);
        $gateways = PaymentGateway::where('is_active', true)->orderBy('sort_order')->get()
            ->filter(fn (PaymentGateway $gateway): bool => in_array(strtoupper($invoice->currency), array_map('strtoupper', $gateway->supported_currencies ?? []), true))
            ->map(fn (PaymentGateway $gateway): array => ['slug' => $gateway->slug, 'name' => $gateway->name, 'manual' => $gateway->slug === 'manual', 'instructions' => $gateway->slug === 'manual' ? data_get($gateway->safe_config, 'instructions') : null])
            ->values();

        return Inertia::render('Central/Billing/PublicInvoice', [
            'invoice' => $invoice, 'gateways' => $gateways,
            'checkoutUrl' => URL::signedRoute('central.billing.invoice.checkout', ['invoice' => $invoice->id]),
            'showUrl' => URL::signedRoute('central.billing.invoice.show', ['invoice' => $invoice->id]),
            'processingUrl' => URL::signedRoute('central.billing.invoice.show', ['invoice' => $invoice->id, 'state' => 'processing']),
            'state' => $request->string('state')->toString(),
        ]);
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
