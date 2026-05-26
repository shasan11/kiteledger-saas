<?php

namespace App\Services\Payments\Gateways;

use App\Models\Invoice;
use App\Models\OnlinePayment;
use App\Models\PaymentGatewaySetting;
use App\Services\Payments\Contracts\PaymentGatewayInterface;
use Illuminate\Http\Request;

class PayPalGateway implements PaymentGatewayInterface
{
    public function __construct(protected PaymentGatewaySetting $setting) {}

    public function getName(): string { return 'paypal'; }
    public function getDisplayName(): string { return $this->setting->display_name ?? 'PayPal'; }
    public function getSupportedCurrencies(): array { return $this->setting->allowed_currencies ?? ['USD', 'EUR', 'GBP', 'CAD', 'AUD']; }
    public function getRequiredCredentials(): array { return ['client_id', 'client_secret']; }
    public function supportsPartialPayments(): bool { return true; }
    public function supportsWebhook(): bool { return true; }
    public function supportsRefund(): bool { return true; }

    private function baseUrl(): string
    {
        return $this->setting->mode === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }

    private function getAccessToken(): string
    {
        $clientId = $this->setting->getCredential('client_id');
        $clientSecret = $this->setting->getCredential('client_secret');

        $ch = curl_init($this->baseUrl() . '/v1/oauth2/token');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => 'grant_type=client_credentials',
            CURLOPT_USERPWD => $clientId . ':' . $clientSecret,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        $response = json_decode(curl_exec($ch), true);
        curl_close($ch);

        if (empty($response['access_token'])) {
            throw new \RuntimeException('PayPal authentication failed.');
        }

        return $response['access_token'];
    }

    public function createPayment(Invoice $invoice, array $payload): array
    {
        $token = $this->getAccessToken();
        $amount = number_format((float) ($payload['amount'] ?? $invoice->balance_due), 2, '.', '');
        $currency = strtoupper($payload['currency'] ?? $invoice->currency?->code ?? 'USD');

        $order = $this->paypalRequest('POST', '/v2/checkout/orders', $token, [
            'intent' => 'CAPTURE',
            'purchase_units' => [[
                'reference_id' => $invoice->id,
                'description' => 'Invoice ' . ($invoice->invoice_no ?? $invoice->id),
                'amount' => ['currency_code' => $currency, 'value' => $amount],
            ]],
            'application_context' => [
                'return_url' => $payload['success_url'],
                'cancel_url' => $payload['cancel_url'],
            ],
        ]);

        $approvalUrl = collect($order['links'] ?? [])->firstWhere('rel', 'approve')['href'] ?? null;

        return [
            'redirect_url' => $approvalUrl,
            'order_id' => $order['id'],
            'provider_order_id' => $order['id'],
            'raw' => $order,
        ];
    }

    public function verifyPayment(array $payload): array
    {
        $orderId = $payload['order_id'] ?? $payload['token'] ?? null;
        if (!$orderId) {
            return ['success' => false, 'reason' => 'Missing order ID'];
        }

        $token = $this->getAccessToken();

        // Capture the order
        $capture = $this->paypalRequest('POST', "/v2/checkout/orders/{$orderId}/capture", $token, []);

        $status = $capture['status'] ?? '';
        $captureId = $capture['purchase_units'][0]['payments']['captures'][0]['id'] ?? null;
        $amount = $capture['purchase_units'][0]['payments']['captures'][0]['amount']['value'] ?? 0;
        $currency = $capture['purchase_units'][0]['payments']['captures'][0]['amount']['currency_code'] ?? '';

        return [
            'success' => $status === 'COMPLETED',
            'payment_id' => $captureId,
            'order_id' => $orderId,
            'amount' => (float) $amount,
            'currency' => $currency,
            'raw' => $capture,
        ];
    }

    public function handleWebhook(Request $request): array
    {
        $event = $request->json()->all();
        $eventType = $event['event_type'] ?? '';
        $eventId = $event['id'] ?? null;
        $resource = $event['resource'] ?? [];

        $result = [
            'success' => true,
            'event_id' => $eventId,
            'event_type' => $eventType,
            'verified' => false,
            'payment_id' => null,
            'order_id' => null,
            'amount' => 0,
            'status' => 'unknown',
            'raw' => $event,
        ];

        if ($eventType === 'CHECKOUT.ORDER.APPROVED' || $eventType === 'PAYMENT.CAPTURE.COMPLETED') {
            $result['order_id'] = $resource['supplementary_data']['related_ids']['order_id'] ?? $resource['id'] ?? null;
            $result['payment_id'] = $resource['id'] ?? null;
            $result['amount'] = (float) ($resource['amount']['value'] ?? 0);
            $result['currency'] = $resource['amount']['currency_code'] ?? '';
            $result['status'] = 'succeeded';
        } elseif ($eventType === 'PAYMENT.CAPTURE.DENIED') {
            $result['payment_id'] = $resource['id'] ?? null;
            $result['status'] = 'failed';
        }

        return $result;
    }

    public function refundPayment(OnlinePayment $payment, float $amount, array $payload = []): array
    {
        $token = $this->getAccessToken();
        $captureId = $payment->provider_payment_id;

        $refund = $this->paypalRequest('POST', "/v2/payments/captures/{$captureId}/refund", $token, [
            'amount' => [
                'value' => number_format($amount, 2, '.', ''),
                'currency_code' => $payment->currency_code,
            ],
        ]);

        return [
            'success' => ($refund['status'] ?? '') === 'COMPLETED',
            'refund_id' => $refund['id'] ?? null,
            'raw' => $refund,
        ];
    }

    private function paypalRequest(string $method, string $path, string $token, array $data): array
    {
        $ch = curl_init($this->baseUrl() . $path);
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $token,
            ],
        ];

        if ($method === 'POST') {
            $opts[CURLOPT_POST] = true;
            $opts[CURLOPT_POSTFIELDS] = json_encode($data);
        }

        curl_setopt_array($ch, $opts);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $decoded = json_decode($response, true) ?? [];

        if ($httpCode >= 400) {
            $msg = $decoded['message'] ?? 'PayPal API error';
            throw new \RuntimeException('PayPal error: ' . $msg);
        }

        return $decoded;
    }
}
