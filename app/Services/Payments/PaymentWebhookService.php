<?php

namespace App\Services\Payments;

use App\Models\OnlinePayment;
use App\Models\OnlinePaymentSetting;
use App\Models\PaymentWebhookLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentWebhookService
{
    public function __construct(
        protected PaymentGatewayManager $gatewayManager,
        protected OnlineInvoicePaymentService $paymentService,
    ) {}

    public function handle(string $provider, Request $request): array
    {
        $settings = OnlinePaymentSetting::current();
        $logEnabled = $settings->webhook_logging_enabled;

        $log = null;
        if ($logEnabled) {
            $log = PaymentWebhookLog::create([
                'provider' => $provider,
                'payload' => $request->json()->all() ?: ['raw' => $request->getContent()],
                'headers' => $request->headers->all(),
                'verified' => false,
                'processed' => false,
                'received_at' => now(),
            ]);
        }

        try {
            $gateway = $this->gatewayManager->driver($provider);
            $result = $gateway->handleWebhook($request);

            if ($logEnabled && $log) {
                $log->forceFill([
                    'event_id' => $result['event_id'] ?? null,
                    'event_type' => $result['event_type'] ?? null,
                    'verified' => $result['verified'] ?? false,
                ])->save();
            }

            if (($result['status'] ?? '') === 'succeeded') {
                $this->processSucceededWebhook($provider, $result, $log);
            } elseif (($result['status'] ?? '') === 'failed') {
                $this->processFailedWebhook($provider, $result, $log);
            }

            if ($logEnabled && $log) {
                $log->forceFill(['processed' => true, 'processed_at' => now()])->save();
            }

            return ['received' => true];
        } catch (\Throwable $e) {
            Log::error("Webhook processing error [{$provider}]: " . $e->getMessage());

            if ($logEnabled && $log) {
                $log->forceFill([
                    'processed' => false,
                    'processing_error' => $e->getMessage(),
                ])->save();
            }

            throw $e;
        }
    }

    private function processSucceededWebhook(string $provider, array $result, ?PaymentWebhookLog $log): void
    {
        DB::transaction(function () use ($provider, $result, $log) {
            // Find by event_id to prevent duplicate processing
            $eventId = $result['event_id'] ?? null;
            if ($eventId) {
                $alreadyProcessed = PaymentWebhookLog::query()
                    ->where('provider', $provider)
                    ->where('event_id', $eventId)
                    ->where('processed', true)
                    ->where('id', '!=', $log?->id ?? 'none')
                    ->exists();

                if ($alreadyProcessed) {
                    return;
                }
            }

            // Find the online payment record
            $onlinePayment = $this->findOnlinePayment($provider, $result);

            if (!$onlinePayment) {
                return;
            }

            if ($log) {
                $log->forceFill(['online_payment_id' => $onlinePayment->id])->save();
            }

            if ($onlinePayment->isSucceeded()) {
                return; // Idempotent
            }

            $this->paymentService->fulfillSucceededPayment($onlinePayment, $result);
        });
    }

    private function processFailedWebhook(string $provider, array $result, ?PaymentWebhookLog $log): void
    {
        $onlinePayment = $this->findOnlinePayment($provider, $result);

        if (!$onlinePayment || $onlinePayment->isSucceeded()) {
            return;
        }

        if ($log) {
            $log->forceFill(['online_payment_id' => $onlinePayment->id])->save();
        }

        $this->paymentService->markFailed($onlinePayment, $result['reason'] ?? 'Payment failed via webhook');
    }

    private function findOnlinePayment(string $provider, array $result): ?OnlinePayment
    {
        $paymentId = $result['payment_id'] ?? null;
        $orderId = $result['order_id'] ?? null;
        $publicToken = $result['public_token'] ?? null;
        $invoiceId = $result['invoice_id'] ?? null;

        $query = OnlinePayment::query()->where('provider', $provider);

        if ($paymentId) {
            $match = (clone $query)->where('provider_payment_id', $paymentId)->first();
            if ($match) return $match;
        }

        if ($orderId) {
            $match = (clone $query)->where('provider_order_id', $orderId)
                ->orWhere('provider_session_id', $orderId)
                ->first();
            if ($match) return $match;
        }

        if ($publicToken) {
            $match = (clone $query)->where('public_token', $publicToken)->latest()->first();
            if ($match) return $match;
        }

        if ($invoiceId) {
            $match = (clone $query)->where('invoice_id', $invoiceId)
                ->whereIn('status', [OnlinePayment::STATUS_PENDING, OnlinePayment::STATUS_PROCESSING])
                ->latest()
                ->first();
            if ($match) return $match;
        }

        return null;
    }
}
