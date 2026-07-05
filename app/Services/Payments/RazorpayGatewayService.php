<?php

namespace App\Services\Payments;

use App\Models\Central\TenantInvoice;
use Illuminate\Support\Facades\Http;

class RazorpayGatewayService extends AbstractExternalGateway
{
    private function client()
    {
        return Http::withBasicAuth($this->settings->public_key, $this->settings->secret_key)->acceptJson();
    }

    public function createPayment(TenantInvoice $invoice, array $context = []): array
    {
        $result = $this->client()->post('https://api.razorpay.com/v1/orders', ['amount' => (int) round($invoice->total * 100), 'currency' => $invoice->currency, 'receipt' => $invoice->invoice_number, 'notes' => ['invoice_id' => (string) $invoice->id]])->throw()->json();

        return ['transaction_id' => $result['id'], 'status' => 'pending', 'public_key' => $this->settings->public_key];
    }

    public function refund(string $transactionId, float $amount): array
    {
        return $this->client()->post("https://api.razorpay.com/v1/payments/{$transactionId}/refund", ['amount' => (int) round($amount * 100)])->throw()->json();
    }

    public function verifyWebhook(array $payload, array $headers = []): bool
    {
        $signature = $headers['x-razorpay-signature'] ?? $headers['X-Razorpay-Signature'] ?? '';

        return $signature !== '' && hash_equals(hash_hmac('sha256', $headers['raw_body'] ?? '', $this->settings->webhook_secret), $signature);
    }
}
