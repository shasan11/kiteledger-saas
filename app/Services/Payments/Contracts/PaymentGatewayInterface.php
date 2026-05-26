<?php

namespace App\Services\Payments\Contracts;

use App\Models\Invoice;
use App\Models\OnlinePayment;
use Illuminate\Http\Request;

interface PaymentGatewayInterface
{
    public function getName(): string;

    public function getDisplayName(): string;

    public function getSupportedCurrencies(): array;

    public function getRequiredCredentials(): array;

    public function supportsPartialPayments(): bool;

    public function supportsWebhook(): bool;

    public function supportsRefund(): bool;

    /**
     * Create a payment session/order/intent.
     * Returns array with at least: ['redirect_url' => string, 'order_id' => string, ...]
     */
    public function createPayment(Invoice $invoice, array $payload): array;

    /**
     * Verify a completed payment (server-side check).
     * Returns array with: ['success' => bool, 'payment_id' => string, 'amount' => float, ...]
     */
    public function verifyPayment(array $payload): array;

    /**
     * Handle incoming webhook event from provider.
     * Returns array with: ['success' => bool, 'event_id' => string, 'event_type' => string, 'payment_id' => string, ...]
     */
    public function handleWebhook(Request $request): array;

    /**
     * Issue a refund on a completed payment.
     */
    public function refundPayment(OnlinePayment $payment, float $amount, array $payload = []): array;
}
