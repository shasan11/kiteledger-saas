<?php

namespace App\Services\Payments\Gateways;

use App\Models\Invoice;
use App\Models\OnlinePayment;
use App\Models\PaymentGatewaySetting;
use App\Services\Payments\Contracts\PaymentGatewayInterface;
use Illuminate\Http\Request;

class EsewaGateway implements PaymentGatewayInterface
{
    public function __construct(protected PaymentGatewaySetting $setting) {}

    public function getName(): string { return 'esewa'; }
    public function getDisplayName(): string { return $this->setting->display_name ?? 'eSewa'; }
    public function getSupportedCurrencies(): array { return ['NPR']; }
    public function getRequiredCredentials(): array { return ['merchant_id', 'secret_key']; }
    public function supportsPartialPayments(): bool { return true; }
    public function supportsWebhook(): bool { return false; }
    public function supportsRefund(): bool { return false; }

    private function gatewayUrl(): string
    {
        return $this->setting->mode === 'live'
            ? 'https://esewa.com.np/epay/main'
            : 'https://uat.esewa.com.np/epay/main';
    }

    private function verifyUrl(): string
    {
        return $this->setting->mode === 'live'
            ? 'https://esewa.com.np/epay/transrec'
            : 'https://uat.esewa.com.np/epay/transrec';
    }

    public function createPayment(Invoice $invoice, array $payload): array
    {
        $merchantId = $this->setting->getCredential('merchant_id');
        if (!$merchantId) {
            throw new \RuntimeException('eSewa merchant ID is not configured.');
        }

        $amount = (float) ($payload['amount'] ?? $invoice->balance_due);
        $transactionId = 'INV-' . ($invoice->invoice_no ?? $invoice->id) . '-' . time();

        // eSewa uses a form POST redirect
        $formFields = [
            'amt' => number_format($amount, 2, '.', ''),
            'pdc' => '0',
            'psc' => '0',
            'txAmt' => '0',
            'tAmt' => number_format($amount, 2, '.', ''),
            'pid' => $transactionId,
            'scd' => $merchantId,
            'su' => $payload['success_url'],
            'fu' => $payload['cancel_url'],
        ];

        return [
            'redirect_url' => $this->gatewayUrl(),
            'form_fields' => $formFields,
            'checkout_mode' => 'esewa_form',
            'provider_order_id' => $transactionId,
            'raw' => $formFields,
        ];
    }

    public function verifyPayment(array $payload): array
    {
        $merchantId = $this->setting->getCredential('merchant_id');
        $refId = $payload['refId'] ?? null;
        $oid = $payload['oid'] ?? null;
        $amt = $payload['amt'] ?? null;

        if (!$refId || !$oid || !$amt) {
            return ['success' => false, 'reason' => 'Missing eSewa verification fields'];
        }

        $ch = curl_init($this->verifyUrl());
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query([
                'amt' => $amt,
                'rid' => $refId,
                'pid' => $oid,
                'scd' => $merchantId,
            ]),
        ]);
        $response = curl_exec($ch);
        curl_close($ch);

        $success = str_contains(strtolower($response ?? ''), 'success');

        return [
            'success' => $success,
            'payment_id' => $refId,
            'order_id' => $oid,
            'amount' => (float) $amt,
            'currency' => 'NPR',
            'raw' => ['response' => $response, 'refId' => $refId],
        ];
    }

    public function handleWebhook(Request $request): array
    {
        return [
            'success' => false,
            'event_id' => null,
            'event_type' => 'esewa.webhook',
            'verified' => false,
            'status' => 'unknown',
            'raw' => $request->all(),
        ];
    }

    public function refundPayment(OnlinePayment $payment, float $amount, array $payload = []): array
    {
        return ['success' => false, 'reason' => 'eSewa refunds must be processed through the eSewa merchant portal.'];
    }
}
