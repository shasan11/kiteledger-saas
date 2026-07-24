<?php

namespace App\Jobs\SaaS;

use App\Models\Central\BillingWebhookEvent;
use App\Models\Central\PaymentTransaction;
use App\Models\Central\TenantInvoice;
use App\Services\SaaS\CentralNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class ProcessBillingWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    public int $timeout = 120;

    public function __construct(public int $eventId) {}

    public function handle(CentralNotificationService $notifications): void
    {
        DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($notifications): void {
            $event = BillingWebhookEvent::lockForUpdate()->findOrFail($this->eventId);
            if ($event->status === 'processed') {
                return;
            }
            [$invoiceId, $transactionId, $state] = $this->details($event->gateway, $event->event_type, $event->payload);
            if ($state === 'ignored' || ! $invoiceId) {
                $event->update(['status' => 'ignored', 'processed_at' => now()]);

                return;
            }
            $invoice = TenantInvoice::lockForUpdate()->find($invoiceId);
            if (! $invoice) {
                $event->update(['status' => 'failed', 'error_message' => 'invoice_not_found']);

                return;
            }
            if ($state === 'failed') {
                $transaction = PaymentTransaction::updateOrCreate(['gateway' => $event->gateway, 'gateway_transaction_id' => $transactionId], ['tenant_id' => $invoice->tenant_id, 'invoice_id' => $invoice->id, 'amount' => $invoice->balance ?: $invoice->total, 'currency' => $invoice->currency, 'status' => 'failed', 'payment_method' => $event->gateway]);
                $notifications->notifyOnce('payment_failed', 'billing', 'critical', 'Payment failed', $event->gateway.' payment failed for invoice '.$invoice->invoice_number.'.', route('central.payments.index', ['status' => 'failed']), $transaction, ['event_id' => $event->event_id], 1);
                $event->update(['status' => 'processed', 'processed_at' => now(), 'error_message' => null]);

                return;
            }
            PaymentTransaction::updateOrCreate(['gateway' => $event->gateway, 'gateway_transaction_id' => $transactionId], ['tenant_id' => $invoice->tenant_id, 'invoice_id' => $invoice->id, 'amount' => $invoice->total, 'currency' => $invoice->currency, 'status' => 'success', 'payment_method' => $event->gateway, 'paid_at' => now()]);
            if ($invoice->status !== 'paid') {
                $invoice->forceFill(['status' => 'paid', 'paid_at' => now(), 'locked_at' => $invoice->locked_at ?? now()])->save();
            }
            if ($invoice->subscription_id) {
                DB::connection(config('tenancy.database.central_connection'))->table('subscriptions')->where('id', $invoice->subscription_id)->update(['status' => 'active', 'updated_at' => now()]);
            }
            $event->update(['status' => 'processed', 'processed_at' => now(), 'error_message' => null]);
        });
    }

    private function details(string $gateway, string $type, array $payload): array
    {
        return match ($gateway) {
            'stripe' => [data_get($payload, 'data.object.metadata.invoice_id') ?? data_get($payload, 'data.object.client_reference_id'), data_get($payload, 'data.object.payment_intent') ?? data_get($payload, 'data.object.id'), in_array($type, ['checkout.session.completed', 'payment_intent.succeeded'], true) ? 'paid' : ($type === 'payment_intent.payment_failed' ? 'failed' : 'ignored')],
            'paypal' => [data_get($payload, 'resource.purchase_units.0.custom_id'), data_get($payload, 'resource.id'), in_array($type, ['CHECKOUT.ORDER.APPROVED', 'PAYMENT.CAPTURE.COMPLETED'], true) ? 'paid' : (in_array($type, ['PAYMENT.CAPTURE.DENIED', 'CHECKOUT.PAYMENT-APPROVAL.REVERSED'], true) ? 'failed' : 'ignored')],
            'razorpay' => [data_get($payload, 'payload.payment.entity.notes.invoice_id'), data_get($payload, 'payload.payment.entity.id'), in_array($type, ['payment.captured', 'order.paid'], true) ? 'paid' : ($type === 'payment.failed' ? 'failed' : 'ignored')],
            default => [null, null, 'ignored'],
        };
    }
}
