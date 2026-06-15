<?php

namespace App\Services\Payments\Gateways;

use App\Models\Invoice;
use App\Models\OnlinePayment;
use App\Models\PaymentGatewaySetting;
use App\Services\Payments\Contracts\PaymentGatewayInterface;
use App\Services\Payments\PaymentHttpClient;
use Illuminate\Http\Request;
use Illuminate\Http\Client\ConnectionException;

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
        $clientId = trim((string) $this->setting->getCredential('client_id'));
        $clientSecret = trim((string) $this->setting->getCredential('client_secret'));
        $mode = $this->setting->mode === 'live' ? 'live' : 'sandbox';

        if ($clientId === '' || $clientSecret === '') {
            throw new \RuntimeException('PayPal client ID and client secret are not configured.');
        }

        try {
            $response = PaymentHttpClient::request()
                ->withBasicAuth($clientId, $clientSecret)
                ->asForm()
                ->post($this->baseUrl() . '/v1/oauth2/token', [
                    'grant_type' => 'client_credentials',
                ]);
        } catch (ConnectionException $e) {
            throw new \RuntimeException(
                'Could not connect to PayPal. Check the server network connection and cURL/CA certificate configuration.',
                previous: $e
            );
        }

        $decoded = $response->json();
        $accessToken = is_array($decoded) ? ($decoded['access_token'] ?? null) : null;

        if ($response->failed() || !$accessToken) {
            $reason = is_array($decoded)
                ? ($decoded['error_description'] ?? $decoded['message'] ?? $decoded['error'] ?? null)
                : null;

            throw new \RuntimeException(
                "PayPal {$mode} authentication failed: " . ($reason ?: "HTTP {$response->status()}")
                . '. Confirm that the credentials belong to the selected mode.'
            );
        }

        return $accessToken;
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
        $orderId = $order['id'] ?? null;

        if (!$orderId || !$approvalUrl) {
            throw new \RuntimeException(
                'PayPal did not return a valid approval URL. Verify the app credentials and account status.'
            );
        }

        return [
            'redirect_url' => $approvalUrl,
            'order_id' => $orderId,
            'provider_order_id' => $orderId,
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

        // Check the current order status first so we never capture an order twice.
        $order = $this->paypalRequest('GET', "/v2/checkout/orders/{$orderId}", $token);
        $status = $order['status'] ?? '';

        if ($status === 'COMPLETED') {
            // Already captured (e.g. by a webhook or a previous verify call).
            return $this->extractCaptureResult($order, $orderId);
        }

        if ($status !== 'APPROVED') {
            return ['success' => false, 'reason' => 'Order is not ready to capture (status: ' . ($status ?: 'unknown') . ').'];
        }

        try {
            // PayPal-Request-Id makes the capture idempotent against retries.
            $capture = $this->paypalRequest('POST', "/v2/checkout/orders/{$orderId}/capture", $token, [], [
                'PayPal-Request-Id: capture-' . $orderId,
            ]);

            return $this->extractCaptureResult($capture, $orderId);
        } catch (\RuntimeException $e) {
            // Lost a race with another capture (webhook/redirect): re-read and accept.
            if (str_contains($e->getMessage(), 'ORDER_ALREADY_CAPTURED')) {
                $order = $this->paypalRequest('GET', "/v2/checkout/orders/{$orderId}", $token);
                return $this->extractCaptureResult($order, $orderId);
            }
            throw $e;
        }
    }

    private function extractCaptureResult(array $data, string $orderId): array
    {
        $capture = $data['purchase_units'][0]['payments']['captures'][0] ?? [];
        $captureStatus = $capture['status'] ?? null;

        $success = $captureStatus === 'COMPLETED'
            || ($captureStatus === null && ($data['status'] ?? '') === 'COMPLETED');

        return [
            'success' => $success,
            'payment_id' => $capture['id'] ?? null,
            'order_id' => $orderId,
            'amount' => (float) ($capture['amount']['value'] ?? 0),
            'currency' => $capture['amount']['currency_code'] ?? '',
            'raw' => $data,
        ];
    }

    public function handleWebhook(Request $request): array
    {
        $event = $request->json()->all();
        $eventType = $event['event_type'] ?? '';
        $eventId = $event['id'] ?? null;
        $resource = $event['resource'] ?? [];

        // Verify the event against PayPal using the configured webhook id.
        $verified = $this->verifyWebhookSignature($request, $event);

        $result = [
            'success' => true,
            'event_id' => $eventId,
            'event_type' => $eventType,
            'verified' => $verified,
            'payment_id' => null,
            'order_id' => null,
            'amount' => 0,
            'status' => 'unknown',
            'raw' => $event,
        ];

        if ($eventType === 'CHECKOUT.ORDER.APPROVED') {
            // Order approved but not captured yet. Capture it now so funds are taken.
            $orderId = $resource['id'] ?? null;
            $result['order_id'] = $orderId;

            if ($orderId) {
                try {
                    $capture = $this->verifyPayment(['order_id' => $orderId]);
                    if ($capture['success']) {
                        $result['payment_id'] = $capture['payment_id'];
                        $result['amount'] = $capture['amount'];
                        $result['currency'] = $capture['currency'];
                        $result['status'] = 'succeeded';
                    }
                } catch (\Throwable) {
                    // Capture failure is reported via PAYMENT.CAPTURE.DENIED separately.
                }
            }
        } elseif ($eventType === 'PAYMENT.CAPTURE.COMPLETED') {
            $result['order_id'] = $resource['supplementary_data']['related_ids']['order_id'] ?? null;
            $result['payment_id'] = $resource['id'] ?? null;
            $result['amount'] = (float) ($resource['amount']['value'] ?? 0);
            $result['currency'] = $resource['amount']['currency_code'] ?? '';
            $result['status'] = 'succeeded';
        } elseif ($eventType === 'PAYMENT.CAPTURE.DENIED' || $eventType === 'PAYMENT.CAPTURE.REVERSED') {
            $result['order_id'] = $resource['supplementary_data']['related_ids']['order_id'] ?? null;
            $result['payment_id'] = $resource['id'] ?? null;
            $result['status'] = 'failed';
            $result['reason'] = 'PayPal reported the capture as ' . strtolower(str_replace('PAYMENT.CAPTURE.', '', $eventType)) . '.';
        } elseif ($eventType === 'PAYMENT.CAPTURE.REFUNDED') {
            $result['payment_id'] = $resource['id'] ?? null;
            $result['status'] = 'refunded';
        }

        return $result;
    }

    /**
     * Verify a webhook event using PayPal's verify-webhook-signature API.
     * Returns true when verified, false when no webhook id is configured.
     * Throws when a webhook id IS configured but verification fails (so the
     * controller responds 400 and PayPal retries / the event is rejected).
     */
    private function verifyWebhookSignature(Request $request, array $event): bool
    {
        $webhookId = $this->setting->getCredential('webhook_id');

        if (!$webhookId) {
            // Cannot cryptographically verify without a webhook id.
            return false;
        }

        $token = $this->getAccessToken();

        $verification = $this->paypalRequest('POST', '/v1/notifications/verify-webhook-signature', $token, [
            'auth_algo' => $request->header('paypal-auth-algo'),
            'cert_url' => $request->header('paypal-cert-url'),
            'transmission_id' => $request->header('paypal-transmission-id'),
            'transmission_sig' => $request->header('paypal-transmission-sig'),
            'transmission_time' => $request->header('paypal-transmission-time'),
            'webhook_id' => $webhookId,
            'webhook_event' => $event,
        ]);

        if (($verification['verification_status'] ?? '') !== 'SUCCESS') {
            throw new \RuntimeException('PayPal webhook signature verification failed.');
        }

        return true;
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

    private function paypalRequest(string $method, string $path, string $token, array $data = [], array $extraHeaders = []): array
    {
        try {
            $client = PaymentHttpClient::request()
                ->withToken($token)
                ->withHeaders($this->headerLinesToArray($extraHeaders));

            if ($method === 'POST') {
                $response = empty($data)
                    ? $client->withBody('{}', 'application/json')->post($this->baseUrl() . $path)
                    : $client->post($this->baseUrl() . $path, $data);
            } else {
                $response = $client->get($this->baseUrl() . $path);
            }
        } catch (ConnectionException $e) {
            throw new \RuntimeException(
                'Could not connect to PayPal. Check the server network connection and cURL/CA certificate configuration.',
                previous: $e
            );
        }

        $decoded = $response->json();

        if ($response->failed()) {
            $msg = is_array($decoded)
                ? ($decoded['message'] ?? $decoded['details'][0]['description'] ?? $decoded['name'] ?? null)
                : null;

            throw new \RuntimeException('PayPal error: ' . ($msg ?: "HTTP {$response->status()}"));
        }

        if (!is_array($decoded)) {
            throw new \RuntimeException('PayPal returned an invalid response.');
        }

        return $decoded;
    }

    private function headerLinesToArray(array $headers): array
    {
        $normalized = [];

        foreach ($headers as $header) {
            if (!str_contains($header, ':')) {
                continue;
            }

            [$name, $value] = explode(':', $header, 2);
            $normalized[trim($name)] = trim($value);
        }

        return $normalized;
    }
}
