<?php

namespace App\Services\Payments;

use App\Contracts\Payments\PaymentGatewayInterface;
use App\Models\Central\PaymentGateway;
use App\Models\Central\TenantInvoice;

abstract class AbstractExternalGateway implements PaymentGatewayInterface
{
    public function __construct(protected PaymentGateway $settings) {}

    public function createPayment(TenantInvoice $invoice, array $context = []): array
    {
        throw new \LogicException(static::class.' requires the provider SDK/API adapter to be configured.');
    }

    public function refund(string $transactionId, float $amount): array
    {
        throw new \LogicException('Refunds are not configured for this gateway.');
    }

    public function verifyWebhook(array $payload, array $headers = []): bool
    {
        return false;
    }
}
