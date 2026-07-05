<?php

namespace App\Services\Payments;

use App\Models\Central\TenantInvoice;
use Illuminate\Support\Facades\Http;

class StripeGatewayService extends AbstractExternalGateway
{
    public function createPayment(TenantInvoice $invoice, array $context = []): array
    {
        $response = Http::withToken($this->settings->secret_key)->asForm()->post('https://api.stripe.com/v1/checkout/sessions', [
            'mode' => 'payment', 'success_url' => $context['success_url'], 'cancel_url' => $context['cancel_url'],
            'client_reference_id' => (string) $invoice->id, 'metadata' => ['invoice_id' => (string) $invoice->id],
            'line_items' => [['quantity' => 1, 'price_data' => ['currency' => strtolower($invoice->currency), 'unit_amount' => (int) round($invoice->total * 100), 'product_data' => ['name' => 'Invoice '.$invoice->invoice_number]]]],
        ])->throw()->json();

        return ['transaction_id' => $response['id'], 'status' => 'pending', 'checkout_url' => $response['url']];
    }

    public function refund(string $transactionId, float $amount): array
    {
        return Http::withToken($this->settings->secret_key)->asForm()->post('https://api.stripe.com/v1/refunds', ['payment_intent' => $transactionId, 'amount' => (int) round($amount * 100)])->throw()->json();
    }

    public function verifyWebhook(array $payload, array $headers = []): bool
    {
        $signature = $headers['stripe-signature'] ?? $headers['Stripe-Signature'] ?? '';
        preg_match('/t=(\d+)/', $signature, $time);
        preg_match('/v1=([a-f0-9]+)/', $signature, $hash);
        if (! isset($time[1], $hash[1]) || abs(time() - (int) $time[1]) > 300) {
            return false;
        }
        $expected = hash_hmac('sha256', $time[1].'.'.($headers['raw_body'] ?? ''), $this->settings->webhook_secret);

        return hash_equals($expected, $hash[1]);
    }
}
