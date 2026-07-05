<?php

namespace App\Services\Payments;

use App\Contracts\Payments\PaymentGatewayInterface;
use App\Models\Central\PaymentTransaction;
use App\Models\Central\TenantInvoice;

class ManualPaymentService implements PaymentGatewayInterface
{
    public function createPayment(TenantInvoice $invoice, array $context = []): array
    {
        $transaction = PaymentTransaction::create(['tenant_id' => $invoice->tenant_id, 'invoice_id' => $invoice->id, 'gateway' => 'manual', 'amount' => $invoice->total, 'currency' => $invoice->currency, 'status' => 'pending', 'payment_method' => $context['payment_method'] ?? 'bank_transfer']);

        return ['transaction_id' => $transaction->id, 'status' => 'pending'];
    }

    public function markPaid(TenantInvoice $invoice, array $context = []): PaymentTransaction
    {
        $transaction = PaymentTransaction::create(['tenant_id' => $invoice->tenant_id, 'invoice_id' => $invoice->id, 'gateway' => 'manual', 'amount' => $context['amount'] ?? $invoice->total, 'currency' => $invoice->currency, 'status' => 'success', 'payment_method' => $context['payment_method'] ?? 'manual', 'paid_at' => now(), 'raw_response' => ['reference' => $context['reference'] ?? null]]);
        $invoice->update(['status' => 'paid', 'paid_at' => now()]);

        return $transaction;
    }

    public function refund(string $transactionId, float $amount): array
    {
        $transaction = PaymentTransaction::findOrFail($transactionId);
        $transaction->update(['status' => 'refunded']);

        return ['status' => 'refunded', 'amount' => $amount];
    }

    public function verifyWebhook(array $payload, array $headers = []): bool
    {
        return false;
    }
}
