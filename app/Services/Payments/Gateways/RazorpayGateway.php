<?php

namespace App\Services\Payments\Gateways;

use App\Models\Invoice;
use App\Models\OnlinePayment;
use App\Models\PaymentGatewaySetting;
use App\Services\Payments\Contracts\PaymentGatewayInterface;
use Illuminate\Http\Request;

class RazorpayGateway implements PaymentGatewayInterface
{
    public function __construct(protected PaymentGatewaySetting $setting) {}

    public function getName(): string { return 'razorpay'; }
    public function getDisplayName(): string { return $this->setting->display_name ?? 'Razorpay'; }
    public function getSupportedCurrencies(): array { return $this->setting->allowed_currencies ?? ['INR', 'USD']; }
    public function getRequiredCredentials(): array { return ['key_id', 'key_secret']; }
    public function supportsPartialPayments(): bool { return true; }
    public function supportsWebhook(): bool { return true; }
    public function supportsRefund(): bool { return true; }

    public function createPayment(Invoice $invoice, array $payload): array
    {
        $keyId = $this->setting->getCredential('key_id');
        $keySecret = $this->setting->getCredential('key_secret');

        if (!$keyId || !$keySecret) {
            throw new \RuntimeException('Razorpay credentials are not configured.');
        }

        $amountPaise = (int) round((float) ($payload['amount'] ?? $invoice->balance_due) * 100);
        $currency = strtoupper($payload['currency'] ?? $invoice->currency?->code ?? 'INR');

        $order = $this->razorpayRequest('POST', 'https://api.razorpay.com/v1/orders', $keyId, $keySecret, [
            'amount' => $amountPaise,
            'currency' => $currency,
            'receipt' => $invoice->invoice_no ?? $invoice->id,
            'notes' => [
                'invoice_id' => $invoice->id,
                'public_token' => $payload['public_token'] ?? '',
            ],
        ]);

        return [
            'order_id' => $order['id'],
            'provider_order_id' => $order['id'],
            'key_id' => $keyId,
            'amount' => $amountPaise,
            'currency' => $currency,
            'name' => $payload['company_name'] ?? 'Invoice Payment',
            'description' => 'Invoice ' . ($invoice->invoice_no ?? $invoice->id),
            'redirect_url' => null, // Razorpay uses JS checkout, not redirect
            'checkout_mode' => 'razorpay_js',
            'raw' => $order,
        ];
    }

    public function verifyPayment(array $payload): array
    {
        $keySecret = $this->setting->getCredential('key_secret');
        $razorpayOrderId = $payload['razorpay_order_id'] ?? '';
        $razorpayPaymentId = $payload['razorpay_payment_id'] ?? '';
        $razorpaySignature = $payload['razorpay_signature'] ?? '';

        if (!$razorpayOrderId || !$razorpayPaymentId || !$razorpaySignature) {
            return ['success' => false, 'reason' => 'Missing Razorpay payment fields'];
        }

        $expectedSignature = hash_hmac('sha256', $razorpayOrderId . '|' . $razorpayPaymentId, $keySecret);

        if (!hash_equals($expectedSignature, $razorpaySignature)) {
            return ['success' => false, 'reason' => 'Signature verification failed'];
        }

        return [
            'success' => true,
            'payment_id' => $razorpayPaymentId,
            'order_id' => $razorpayOrderId,
            'amount' => (float) ($payload['amount'] ?? 0) / 100,
            'currency' => strtoupper($payload['currency'] ?? ''),
            'raw' => $payload,
        ];
    }

    public function handleWebhook(Request $request): array
    {
        $webhookSecret = $this->setting->getCredential('webhook_secret');
        $payload = $request->getContent();

        if ($webhookSecret) {
            $expectedSignature = hash_hmac('sha256', $payload, $webhookSecret);
            $receivedSignature = $request->header('X-Razorpay-Signature', '');
            if (!hash_equals($expectedSignature, $receivedSignature)) {
                throw new \RuntimeException('Razorpay webhook signature verification failed.');
            }
        }

        $event = json_decode($payload, true);
        $eventType = $event['event'] ?? '';
        $entity = $event['payload']['payment']['entity'] ?? [];

        $result = [
            'success' => true,
            'event_id' => $event['id'] ?? null,
            'event_type' => $eventType,
            'verified' => (bool) $webhookSecret,
            'payment_id' => $entity['id'] ?? null,
            'order_id' => $entity['order_id'] ?? null,
            'amount' => ($entity['amount'] ?? 0) / 100,
            'currency' => strtoupper($entity['currency'] ?? ''),
            'status' => 'unknown',
            'raw' => $event,
        ];

        if ($eventType === 'payment.captured') {
            $result['status'] = 'succeeded';
            $result['invoice_id'] = $entity['notes']['invoice_id'] ?? null;
            $result['public_token'] = $entity['notes']['public_token'] ?? null;
        } elseif ($eventType === 'payment.failed') {
            $result['status'] = 'failed';
            $result['reason'] = $entity['error_description'] ?? 'Payment failed';
        }

        return $result;
    }

    public function refundPayment(OnlinePayment $payment, float $amount, array $payload = []): array
    {
        $keyId = $this->setting->getCredential('key_id');
        $keySecret = $this->setting->getCredential('key_secret');
        $paymentId = $payment->provider_payment_id;

        $amountPaise = (int) round($amount * 100);

        $refund = $this->razorpayRequest(
            'POST',
            "https://api.razorpay.com/v1/payments/{$paymentId}/refund",
            $keyId,
            $keySecret,
            ['amount' => $amountPaise]
        );

        return [
            'success' => isset($refund['id']),
            'refund_id' => $refund['id'] ?? null,
            'raw' => $refund,
        ];
    }

    private function razorpayRequest(string $method, string $url, string $keyId, string $keySecret, array $data): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERPWD => $keyId . ':' . $keySecret,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        ]);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $decoded = json_decode($response, true) ?? [];

        if ($httpCode >= 400) {
            $msg = $decoded['error']['description'] ?? 'Razorpay API error';
            throw new \RuntimeException('Razorpay error: ' . $msg);
        }

        return $decoded;
    }
}
