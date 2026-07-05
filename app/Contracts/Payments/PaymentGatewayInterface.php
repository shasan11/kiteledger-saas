<?php

namespace App\Contracts\Payments;

use App\Models\Central\TenantInvoice;

interface PaymentGatewayInterface
{
    public function createPayment(TenantInvoice $invoice, array $context = []): array;

    public function refund(string $transactionId, float $amount): array;

    public function verifyWebhook(array $payload, array $headers = []): bool;
}
