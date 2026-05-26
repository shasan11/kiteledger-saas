<?php

namespace App\Services\Payments\Gateways;

use App\Models\Invoice;
use App\Models\OnlinePayment;
use App\Models\PaymentGatewaySetting;
use App\Services\Payments\Contracts\PaymentGatewayInterface;
use Illuminate\Http\Request;

class KhaltiGateway implements PaymentGatewayInterface
{
    public function __construct(protected PaymentGatewaySetting $setting) {}

    public function getName(): string { return 'khalti'; }
    public function getDisplayName(): string { return $this->setting->display_name ?? 'Khalti'; }
    public function getSupportedCurrencies(): array { return ['NPR']; }
    public function getRequiredCredentials(): array { return ['secret_key']; }
    public function supportsPartialPayments(): bool { return true; }
    public function supportsWebhook(): bool { return false; }
    public function supportsRefund(): bool { return false; }

    private function baseUrl(): string
    {
        return $this->setting->mode === 'live'
            ? 'https://khalti.com'
            : 'https://dev.khalti.com';
    }

    public function createPayment(Invoice $invoice, array $payload): array
    {
        $secretKey = $this->setting->getCredential('secret_key');
        if (!$secretKey) {
            throw new \RuntimeException('Khalti secret key is not configured.');
        }

        $amountPaisa = (int) round((float) ($payload['amount'] ?? $invoice->balance_due) * 100);

        $response = $this->khaltiRequest('POST', '/api/v2/epayment/initiate/', $secretKey, [
            'return_url' => $payload['success_url'],
            'website_url' => $payload['base_url'] ?? url('/'),
            'amount' => $amountPaisa,
            'purchase_order_id' => $invoice->invoice_no ?? $invoice->id,
            'purchase_order_name' => 'Invoice ' . ($invoice->invoice_no ?? $invoice->id),
            'customer_info' => [
                'name' => $invoice->contact?->name ?? 'Customer',
                'email' => $invoice->contact?->email ?? '',
            ],
        ]);

        return [
            'redirect_url' => $response['payment_url'],
            'pidx' => $response['pidx'],
            'provider_order_id' => $response['pidx'],
            'raw' => $response,
        ];
    }

    public function verifyPayment(array $payload): array
    {
        $secretKey = $this->setting->getCredential('secret_key');
        $pidx = $payload['pidx'] ?? null;

        if (!$pidx) {
            return ['success' => false, 'reason' => 'Missing pidx'];
        }

        $response = $this->khaltiRequest('POST', '/api/v2/epayment/lookup/', $secretKey, ['pidx' => $pidx]);

        $succeeded = ($response['status'] ?? '') === 'Completed';

        return [
            'success' => $succeeded,
            'payment_id' => $response['transaction_id'] ?? $pidx,
            'order_id' => $pidx,
            'amount' => ($response['total_amount'] ?? 0) / 100,
            'currency' => 'NPR',
            'raw' => $response,
        ];
    }

    public function handleWebhook(Request $request): array
    {
        // Khalti does not have reliable webhooks; verification is done via lookup
        return [
            'success' => false,
            'event_id' => null,
            'event_type' => 'khalti.webhook',
            'verified' => false,
            'status' => 'unknown',
            'raw' => $request->all(),
        ];
    }

    public function refundPayment(OnlinePayment $payment, float $amount, array $payload = []): array
    {
        return ['success' => false, 'reason' => 'Khalti refunds must be processed through the Khalti merchant dashboard.'];
    }

    private function khaltiRequest(string $method, string $path, string $secretKey, array $data): array
    {
        $ch = curl_init($this->baseUrl() . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Key ' . $secretKey,
                'Content-Type: application/json',
            ],
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $decoded = json_decode($response, true) ?? [];

        if ($httpCode >= 400) {
            $msg = $decoded['detail'] ?? json_encode($decoded);
            throw new \RuntimeException('Khalti error: ' . $msg);
        }

        return $decoded;
    }
}
