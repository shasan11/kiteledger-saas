<?php

namespace App\Jobs\SaaS;

use App\Models\Central\BillingWebhookEvent;
use App\Models\Central\PaymentTransaction;
use App\Models\Central\TenantInvoice;
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

    public function handle(): void
    {
        DB::connection(config('tenancy.database.central_connection'))->transaction(function (): void {
            $event = BillingWebhookEvent::lockForUpdate()->findOrFail($this->eventId);
            if ($event->status === 'processed') {
                return;
            }
            [$invoiceId, $transactionId, $paid] = $this->details($event->gateway, $event->event_type, $event->payload);
            if (! $paid || ! $invoiceId) {
                $event->update(['status' => 'ignored', 'processed_at' => now()]);

                return;
            }
            $invoice = TenantInvoice::lockForUpdate()->find($invoiceId);
            if (! $invoice) {
                $event->update(['status' => 'failed', 'error_message' => 'invoice_not_found']);

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
            'stripe' => [data_get($payload, 'data.object.metadata.invoice_id') ?? data_get($payload, 'data.object.client_reference_id'), data_get($payload, 'data.object.payment_intent') ?? data_get($payload, 'data.object.id'), in_array($type, ['checkout.session.completed', 'payment_intent.succeeded'], true)],
            'paypal' => [data_get($payload, 'resource.purchase_units.0.custom_id'), data_get($payload, 'resource.id'), in_array($type, ['CHECKOUT.ORDER.APPROVED', 'PAYMENT.CAPTURE.COMPLETED'], true)],
            'razorpay' => [data_get($payload, 'payload.payment.entity.notes.invoice_id'), data_get($payload, 'payload.payment.entity.id'), in_array($type, ['payment.captured', 'order.paid'], true)],
            default => [null, null, false],
        };
    }
}
