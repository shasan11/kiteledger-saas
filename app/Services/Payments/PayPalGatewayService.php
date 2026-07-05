<?php

namespace App\Services\Payments;

use App\Models\Central\TenantInvoice;
use Illuminate\Support\Facades\Http;

class PayPalGatewayService extends AbstractExternalGateway
{
    private function base(): string
    {
        return $this->settings->mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    }

    private function token(): string
    {
        return Http::withBasicAuth($this->settings->public_key, $this->settings->secret_key)->asForm()->post($this->base().'/v1/oauth2/token', ['grant_type' => 'client_credentials'])->throw()->json('access_token');
    }

    public function createPayment(TenantInvoice $invoice, array $context = []): array
    {
        $result = Http::withToken($this->token())->post($this->base().'/v2/checkout/orders', ['intent' => 'CAPTURE', 'purchase_units' => [['custom_id' => (string) $invoice->id, 'invoice_id' => $invoice->invoice_number, 'amount' => ['currency_code' => $invoice->currency, 'value' => number_format($invoice->total, 2, '.', '')]]], 'application_context' => ['return_url' => $context['success_url'], 'cancel_url' => $context['cancel_url']]])->throw()->json();
        $link = collect($result['links'] ?? [])->firstWhere('rel', 'approve');
        $approve = $link['href'] ?? null;

        return ['transaction_id' => $result['id'], 'status' => 'pending', 'checkout_url' => $approve];
    }

    public function refund(string $transactionId, float $amount): array
    {
        return Http::withToken($this->token())->post($this->base()."/v2/payments/captures/{$transactionId}/refund", ['amount' => ['value' => number_format($amount, 2, '.', ''), 'currency_code' => $this->settings->config['currency'] ?? 'USD']])->throw()->json();
    }

    public function verifyWebhook(array $payload, array $headers = []): bool
    {
        $config = $this->settings->config ?? [];
        if (empty($config['webhook_id'])) {
            return false;
        }
        $result = Http::withToken($this->token())->post($this->base().'/v1/notifications/verify-webhook-signature', ['auth_algo' => $headers['paypal-auth-algo'] ?? null, 'cert_url' => $headers['paypal-cert-url'] ?? null, 'transmission_id' => $headers['paypal-transmission-id'] ?? null, 'transmission_sig' => $headers['paypal-transmission-sig'] ?? null, 'transmission_time' => $headers['paypal-transmission-time'] ?? null, 'webhook_id' => $config['webhook_id'], 'webhook_event' => $payload])->throw()->json();

        return ($result['verification_status'] ?? null) === 'SUCCESS';
    }
}
