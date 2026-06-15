<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\InvoicePaymentLink;
use App\Models\OnlinePayment;
use App\Models\OnlinePaymentSetting;
use App\Models\PaymentGatewaySetting;
use App\Services\Payments\OnlineInvoicePaymentService;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Http\Request;

class PublicInvoicePaymentController extends Controller
{
    public function __construct(
        protected OnlineInvoicePaymentService $paymentService,
        protected PaymentGatewayManager $gatewayManager,
    ) {}

    public function show(string $token)
    {
        $data = $this->loadPublicInvoiceData($token);

        if (!$data) {
            return response()->json(['message' => 'Invoice not found or link is invalid.'], 404);
        }

        return response()->json($data);
    }

    public function createPayment(Request $request, string $token)
    {
        $link = InvoicePaymentLink::query()
            ->where('public_token', $token)
            ->where('active', true)
            ->first();

        if (!$link || !$link->isUsable()) {
            return response()->json(['message' => 'This payment link is invalid or has expired.'], 404);
        }

        $invoice = $link->invoice()->with(['contact', 'currency', 'branch'])->first();

        if (!$invoice) {
            return response()->json(['message' => 'Invoice not found.'], 404);
        }

        if ((bool) $invoice->void || $invoice->status === 'void') {
            return response()->json(['message' => 'This invoice is voided and cannot be paid.'], 422);
        }

        $settings = OnlinePaymentSetting::current();

        if (!$settings->enable_online_payment) {
            return response()->json(['message' => 'Online payments are not available.'], 422);
        }

        $validated = $request->validate([
            'provider' => ['required', 'string', 'in:stripe,paypal,razorpay'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'customer_name' => ['nullable', 'string', 'max:200'],
            'customer_email' => ['nullable', 'email', 'max:200'],
            'customer_phone' => ['nullable', 'string', 'max:50'],
        ]);

        $provider = $validated['provider'];
        $amount = (float) $validated['amount'];

        // Validate gateway is enabled
        $gatewaySetting = PaymentGatewaySetting::forProvider($provider);
        if (!$gatewaySetting || !$gatewaySetting->enabled) {
            return response()->json(['message' => "Payment provider '{$provider}' is not available."], 422);
        }

        // Validate amount rules
        try {
            $this->paymentService->validatePaymentAmount($invoice, $amount, $settings);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        // Validate currency
        $invoiceCurrency = strtoupper($invoice->currency?->code ?? 'USD');
        $supportedCurrencies = array_map('strtoupper', $gatewaySetting->allowed_currencies ?? []);
        if (!empty($supportedCurrencies) && !in_array($invoiceCurrency, $supportedCurrencies, true)) {
            return response()->json([
                'message' => "This payment method does not support {$invoiceCurrency} currency.",
            ], 422);
        }

        $onlinePayment = null;

        try {
            $gateway = $this->gatewayManager->driver($provider);

            $onlinePayment = $this->paymentService->createPendingPayment($invoice, $provider, $amount, $token, [
                'name' => $validated['customer_name'] ?? null,
                'email' => $validated['customer_email'] ?? null,
                'phone' => $validated['customer_phone'] ?? null,
            ]);

            $appSettings = AppSetting::query()->first();
            $redirectQuery = http_build_query([
                'online_payment_id' => $onlinePayment->id,
                'provider' => $provider,
            ]);
            $successUrl = url("/pay/invoice/{$token}/success") . '?' . $redirectQuery;
            $cancelUrl = url("/pay/invoice/{$token}/cancel") . '?' . $redirectQuery;

            $gatewayPayload = [
                'amount' => $amount,
                'currency' => $invoiceCurrency,
                'public_token' => $token,
                'company_name' => $appSettings?->company_name ?? 'Invoice Payment',
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
                'base_url' => url('/'),
            ];

            $result = $gateway->createPayment($invoice, $gatewayPayload);

            // Store provider IDs on the payment record
            $onlinePayment->forceFill([
                'provider_session_id' => $result['provider_session_id'] ?? $result['session_id'] ?? null,
                'provider_order_id' => $result['provider_order_id'] ?? $result['order_id'] ?? null,
                'status' => OnlinePayment::STATUS_PROCESSING,
                'raw_request' => $gatewayPayload,
            ])->save();

            return response()->json([
                'online_payment_id' => $onlinePayment->id,
                'provider' => $provider,
                'redirect_url' => $result['redirect_url'] ?? null,
                'checkout_mode' => $result['checkout_mode'] ?? 'redirect',
                'gateway_data' => $this->safeGatewayData($result),
            ]);
        } catch (\RuntimeException $e) {
            if ($onlinePayment?->isPending()) {
                $this->paymentService->markFailed($onlinePayment, $e->getMessage());
            }

            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function verifyPayment(Request $request, string $token)
    {
        $validated = $request->validate([
            'online_payment_id' => ['required', 'uuid'],
            'provider' => ['required', 'string', 'in:stripe,paypal,razorpay'],
        ]);

        $onlinePayment = OnlinePayment::query()
            ->where('id', $validated['online_payment_id'])
            ->where('public_token', $token)
            ->first();

        if (!$onlinePayment) {
            return response()->json(['message' => 'Payment record not found.'], 404);
        }

        if ($onlinePayment->provider !== $validated['provider']) {
            return response()->json(['message' => 'Payment provider does not match this payment.'], 422);
        }

        if ($onlinePayment->isSucceeded()) {
            return response()->json(['status' => 'succeeded', 'message' => 'Payment already confirmed.']);
        }

        try {
            $gateway = $this->gatewayManager->driver($validated['provider']);
            $verifyPayload = array_merge($request->except(['online_payment_id', 'provider']), [
                'session_id' => $onlinePayment->provider_session_id,
                'order_id' => $onlinePayment->provider_order_id,
            ]);

            $result = $gateway->verifyPayment($verifyPayload);

            if ($result['success']) {
                $this->paymentService->fulfillSucceededPayment($onlinePayment, $result);
                return response()->json(['status' => 'succeeded']);
            }

            return response()->json([
                'status' => 'processing',
                'message' => 'Payment not yet confirmed. Please wait.',
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    private function loadPublicInvoiceData(string $token): ?array
    {
        $link = InvoicePaymentLink::query()
            ->where('public_token', $token)
            ->where('active', true)
            ->first();

        if (!$link || !$link->isUsable()) {
            return null;
        }

        $invoice = $link->invoice()->with([
            'contact',
            'currency',
            'branch',
            'invoiceLines',
        ])->first();

        if (!$invoice) {
            return null;
        }

        $link->touchAccess();

        $settings = OnlinePaymentSetting::current();
        $appSettings = AppSetting::query()->first();

        $enabledGateways = PaymentGatewaySetting::allEnabled()
            ->filter(function ($gw) use ($invoice) {
                $invoiceCurrency = strtoupper($invoice->currency?->code ?? 'USD');
                $supported = array_map('strtoupper', $gw->allowed_currencies ?? []);
                return empty($supported) || in_array($invoiceCurrency, $supported, true);
            })
            ->map(fn ($gw) => [
                'provider' => $gw->provider,
                'display_name' => $gw->display_name ?? ucfirst($gw->provider),
                'mode' => $gw->mode,
                'public_config' => $gw->public_config ?? [],
            ])
            ->values();

        return [
            'company' => [
                'name' => $appSettings?->company_name,
                'logo_url' => $appSettings?->logo ? asset('storage/' . $appSettings->logo) : null,
                'address' => $appSettings?->address,
            ],
            'invoice' => [
                'invoice_no' => $invoice->invoice_no,
                'invoice_date' => $invoice->invoice_date?->toDateString(),
                'due_date' => $invoice->due_date?->toDateString(),
                'customer_name' => $invoice->contact?->name,
                'currency_code' => $invoice->currency?->code ?? 'USD',
                'currency_symbol' => $invoice->currency?->symbol ?? '$',
                'total' => $invoice->total,
                'paid_total' => $invoice->paid_total,
                'balance_due' => $invoice->balance_due,
                'status' => $invoice->status,
                'lines' => $invoice->invoiceLines->map(fn ($line) => [
                    'description' => $line->product_name ?? $line->product?->name ?? $line->description ?? '',
                    'quantity' => $line->quantity,
                    'unit_price' => $line->unit_price,
                    'discount' => $line->discount ?? 0,
                    'tax_amount' => $line->tax_amount ?? 0,
                    'total' => $line->total ?? 0,
                ]),
            ],
            'settings' => [
                'allow_partial_payment' => $settings->allow_partial_invoice_payment,
                'minimum_partial_amount' => $settings->minimum_partial_payment_amount,
                'allow_overpayment' => $settings->allow_invoice_overpayment,
                'enable_google_login' => $settings->enable_google_login,
                'google_client_id' => $settings->enable_google_login ? $settings->google_client_id : null,
                'online_payment_enabled' => $settings->enable_online_payment,
            ],
            'payment_methods' => $enabledGateways,
            'link' => [
                'public_token' => $token,
                'expires_at' => $link->expires_at?->toISOString(),
            ],
        ];
    }

    private function safeGatewayData(array $result): array
    {
        // Remove sensitive server-side data, keep only what frontend needs
        $safe = [];
        $safeKeys = ['order_id', 'key_id', 'amount', 'currency', 'name', 'description', 'checkout_mode', 'form_fields', 'pidx'];
        foreach ($safeKeys as $key) {
            if (isset($result[$key])) {
                $safe[$key] = $result[$key];
            }
        }
        return $safe;
    }
}
