<?php

namespace App\Services\Payments\Gateways;

use App\Models\Invoice;
use App\Models\OnlinePayment;
use App\Models\PaymentGatewaySetting;
use App\Services\Payments\Contracts\PaymentGatewayInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class StripeGateway implements PaymentGatewayInterface
{
    public function __construct(protected PaymentGatewaySetting $setting) {}

    public function getName(): string { return 'stripe'; }
    public function getDisplayName(): string { return $this->setting->display_name ?? 'Stripe'; }
    public function getSupportedCurrencies(): array { return $this->setting->allowed_currencies ?? ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'INR']; }
    public function getRequiredCredentials(): array { return ['publishable_key', 'secret_key', 'webhook_secret']; }
    public function supportsPartialPayments(): bool { return true; }
    public function supportsWebhook(): bool { return true; }
    public function supportsRefund(): bool { return true; }

    public function createPayment(Invoice $invoice, array $payload): array
    {
        $secretKey = $this->setting->getCredential('secret_key');
        if (!$secretKey) {
            throw new \RuntimeException('Stripe secret key is not configured.');
        }

        $amountCents = (int) round((float) ($payload['amount'] ?? $invoice->balance_due) * 100);
        $currency = strtolower($payload['currency'] ?? $invoice->currency?->code ?? 'usd');
        $successUrl = $payload['success_url'];
        $cancelUrl = $payload['cancel_url'];
        $token = $payload['public_token'];

        $response = $this->stripeRequest('POST', 'https://api.stripe.com/v1/checkout/sessions', $secretKey, [
            'payment_method_types' => ['card'],
            'line_items' => [[
                'price_data' => [
                    'currency' => $currency,
                    'product_data' => [
                        'name' => 'Invoice ' . ($invoice->invoice_no ?? $invoice->id),
                    ],
                    'unit_amount' => $amountCents,
                ],
                'quantity' => 1,
            ]],
            'mode' => 'payment',
            'success_url' => $successUrl . '?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $cancelUrl,
            'metadata' => [
                'invoice_id' => $invoice->id,
                'public_token' => $token,
            ],
        ]);

        return [
            'redirect_url' => $response['url'],
            'session_id' => $response['id'],
            'order_id' => $response['id'],
            'provider_session_id' => $response['id'],
        ];
    }

    public function verifyPayment(array $payload): array
    {
        $secretKey = $this->setting->getCredential('secret_key');
        $sessionId = $payload['session_id'] ?? null;
        if (!$sessionId) {
            return ['success' => false, 'reason' => 'Missing session_id'];
        }

        $session = $this->stripeRequest('GET', "https://api.stripe.com/v1/checkout/sessions/{$sessionId}", $secretKey, []);

        $paid = ($session['payment_status'] ?? '') === 'paid';

        return [
            'success' => $paid,
            'payment_id' => $session['payment_intent'] ?? null,
            'order_id' => $session['id'],
            'amount' => ($session['amount_total'] ?? 0) / 100,
            'currency' => strtoupper($session['currency'] ?? ''),
            'raw' => $session,
        ];
    }

    public function handleWebhook(Request $request): array
    {
        $webhookSecret = $this->setting->getCredential('webhook_secret');
        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature', '');

        if ($webhookSecret) {
            $this->verifyStripeSignature($payload, $sigHeader, $webhookSecret);
        }

        $event = json_decode($payload, true);
        $eventType = $event['type'] ?? '';
        $eventId = $event['id'] ?? null;
        $data = $event['data']['object'] ?? [];

        $result = [
            'success' => true,
            'event_id' => $eventId,
            'event_type' => $eventType,
            'verified' => (bool) $webhookSecret,
            'payment_id' => null,
            'order_id' => null,
            'amount' => 0,
            'status' => 'unknown',
            'raw' => $event,
        ];

        if ($eventType === 'checkout.session.completed') {
            $result['order_id'] = $data['id'] ?? null;
            $result['payment_id'] = $data['payment_intent'] ?? null;
            $result['amount'] = ($data['amount_total'] ?? 0) / 100;
            $result['currency'] = strtoupper($data['currency'] ?? '');
            $result['status'] = ($data['payment_status'] ?? '') === 'paid' ? 'succeeded' : 'processing';
            $result['invoice_id'] = $data['metadata']['invoice_id'] ?? null;
            $result['public_token'] = $data['metadata']['public_token'] ?? null;
        } elseif ($eventType === 'payment_intent.payment_failed') {
            $result['payment_id'] = $data['id'] ?? null;
            $result['status'] = 'failed';
            $result['reason'] = $data['last_payment_error']['message'] ?? 'Payment failed';
        }

        return $result;
    }

    public function refundPayment(OnlinePayment $payment, float $amount, array $payload = []): array
    {
        $secretKey = $this->setting->getCredential('secret_key');
        $paymentIntentId = $payment->provider_payment_id;
        if (!$paymentIntentId) {
            return ['success' => false, 'reason' => 'No payment intent ID'];
        }

        $amountCents = (int) round($amount * 100);

        $refund = $this->stripeRequest('POST', 'https://api.stripe.com/v1/refunds', $secretKey, [
            'payment_intent' => $paymentIntentId,
            'amount' => $amountCents,
        ]);

        return [
            'success' => ($refund['status'] ?? '') === 'succeeded',
            'refund_id' => $refund['id'] ?? null,
            'raw' => $refund,
        ];
    }

    private function verifyStripeSignature(string $payload, string $sigHeader, string $secret): void
    {
        $parts = explode(',', $sigHeader);
        $timestamp = null;
        $signatures = [];

        foreach ($parts as $part) {
            [$key, $value] = explode('=', $part, 2);
            if ($key === 't') $timestamp = $value;
            if ($key === 'v1') $signatures[] = $value;
        }

        if (!$timestamp || empty($signatures)) {
            throw new \RuntimeException('Invalid Stripe webhook signature.');
        }

        $expectedSig = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);
        foreach ($signatures as $sig) {
            if (hash_equals($expectedSig, $sig)) {
                return;
            }
        }

        throw new \RuntimeException('Stripe webhook signature verification failed.');
    }

    private function stripeRequest(string $method, string $url, string $secretKey, array $data): array
    {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $secretKey,
                'Content-Type: application/x-www-form-urlencoded',
            ],
        ]);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($this->flattenForStripe($data)));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $decoded = json_decode($response, true);

        if ($httpCode >= 400) {
            $errorMsg = $decoded['error']['message'] ?? 'Stripe API error';
            throw new \RuntimeException('Stripe error: ' . $errorMsg);
        }

        return $decoded ?? [];
    }

    private function flattenForStripe(array $data, string $prefix = ''): array
    {
        $result = [];
        foreach ($data as $key => $value) {
            $fullKey = $prefix ? "{$prefix}[{$key}]" : $key;
            if (is_array($value)) {
                $result = array_merge($result, $this->flattenForStripe($value, $fullKey));
            } else {
                $result[$fullKey] = $value;
            }
        }
        return $result;
    }
}
