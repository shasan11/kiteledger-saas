<?php

namespace App\Jobs\SaaS;

use App\Models\Central\BillingWebhookEvent;
use App\Models\Central\PaymentTransaction;
use App\Models\Central\TenantInvoice;
use App\Services\SaaS\CentralNotificationService;
use App\Services\SaaS\InvoicePaymentReconciler;
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

    public function handle(CentralNotificationService $notifications, InvoicePaymentReconciler $reconciler): void
    {
        DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($notifications, $reconciler): void {
            $event = BillingWebhookEvent::lockForUpdate()->findOrFail($this->eventId);
            if ($event->status === 'processed') {
                return;
            }
            [$invoiceId, $transactionId, $state, $amount, $currency] = $this->details($event->gateway, $event->event_type, $event->payload);
            if ($state === 'ignored' || ! $invoiceId) {
                $event->update(['status' => 'ignored', 'processed_at' => now()]);

                return;
            }
            $invoice = TenantInvoice::lockForUpdate()->find($invoiceId);
            if (! $invoice) {
                $event->update(['status' => 'failed', 'error_message' => 'invoice_not_found']);

                return;
            }
            if (blank($transactionId)) {
                $event->update(['status' => 'failed', 'processed_at' => now(), 'error_message' => 'transaction_id_missing']);

                return;
            }
            if ($state === 'failed') {
                $transaction = PaymentTransaction::updateOrCreate(['gateway' => $event->gateway, 'gateway_transaction_id' => $transactionId], ['tenant_id' => $invoice->tenant_id, 'invoice_id' => $invoice->id, 'amount' => $amount ?: ($invoice->balance ?: $invoice->total), 'currency' => $currency ?: $invoice->currency, 'status' => 'failed', 'payment_method' => $event->gateway, 'raw_response' => ['event_id' => $event->event_id]]);
                $notifications->notifyOnce('payment_failed', 'billing', 'critical', 'Payment failed', $event->gateway.' payment failed for invoice '.$invoice->invoice_number.'.', route('central.payments.index', ['status' => 'failed']), $transaction, ['event_id' => $event->event_id], 1);
                $event->update(['status' => 'processed', 'processed_at' => now(), 'error_message' => null]);

                return;
            }
            $expected = round((float) ($invoice->balance ?: $invoice->total), 2);
            $received = round((float) $amount, 2);
            if ($received <= 0 || abs($received - $expected) > 0.005 || strtoupper((string) $currency) !== strtoupper((string) $invoice->currency)) {
                $event->update(['status' => 'failed', 'processed_at' => now(), 'error_message' => 'payment_amount_or_currency_mismatch']);
                $notifications->notifyOnce('payment_mismatch', 'billing', 'critical', 'Payment requires review', $event->gateway.' reported an amount or currency that does not match invoice '.$invoice->invoice_number.'.', route('central.payments.index'), $invoice, ['event_id' => $event->event_id], 1);

                return;
            }
            $transaction = PaymentTransaction::where('gateway', $event->gateway)
                ->where('gateway_transaction_id', $transactionId)
                ->lockForUpdate()
                ->first();
            if ($transaction && (int) $transaction->invoice_id !== (int) $invoice->id) {
                $event->update(['status' => 'failed', 'processed_at' => now(), 'error_message' => 'transaction_invoice_mismatch']);

                return;
            }
            $transaction ??= PaymentTransaction::where('invoice_id', $invoice->id)
                ->where('gateway', $event->gateway)
                ->where('status', 'pending')
                ->whereBetween('amount', [$received - 0.005, $received + 0.005])
                ->whereRaw('UPPER(currency) = ?', [strtoupper((string) $currency)])
                ->latest('id')
                ->lockForUpdate()
                ->first();
            $transaction ??= new PaymentTransaction;
            $transaction->fill([
                'tenant_id' => $invoice->tenant_id,
                'invoice_id' => $invoice->id,
                'gateway' => $event->gateway,
                'gateway_transaction_id' => $transactionId,
                'amount' => $received,
                'currency' => strtoupper((string) $currency),
                'status' => 'success',
                'payment_method' => $event->gateway,
                'paid_at' => now(),
                'failed_reason' => null,
                'raw_response' => ['event_id' => $event->event_id],
            ])->save();
            $reconciler->reconcile($invoice);
            $event->update(['status' => 'processed', 'processed_at' => now(), 'error_message' => null]);
        });
    }

    private function details(string $gateway, string $type, array $payload): array
    {
        return match ($gateway) {
            'stripe' => $this->stripeDetails($type, $payload),
            'paypal' => $this->paypalDetails($type, $payload),
            'razorpay' => $this->razorpayDetails($type, $payload),
            default => [null, null, 'ignored', null, null],
        };
    }

    private function stripeDetails(string $type, array $payload): array
    {
        $object = data_get($payload, 'data.object', []);
        $paid = $type === 'payment_intent.succeeded' || ($type === 'checkout.session.completed' && data_get($object, 'payment_status') === 'paid');
        $state = $paid ? 'paid' : ($type === 'payment_intent.payment_failed' ? 'failed' : 'ignored');
        $amount = (float) (data_get($object, 'amount_received') ?? data_get($object, 'amount_total') ?? data_get($object, 'amount') ?? 0) / 100;

        return [data_get($object, 'metadata.invoice_id') ?? data_get($object, 'client_reference_id'), data_get($object, 'payment_intent') ?? data_get($object, 'id'), $state, $amount, strtoupper((string) data_get($object, 'currency'))];
    }

    private function paypalDetails(string $type, array $payload): array
    {
        $resource = data_get($payload, 'resource', []);
        $state = $type === 'PAYMENT.CAPTURE.COMPLETED' ? 'paid' : (in_array($type, ['PAYMENT.CAPTURE.DENIED', 'CHECKOUT.PAYMENT-APPROVAL.REVERSED'], true) ? 'failed' : 'ignored');

        return [data_get($resource, 'custom_id') ?? data_get($resource, 'purchase_units.0.custom_id'), data_get($resource, 'id'), $state, (float) data_get($resource, 'amount.value', 0), strtoupper((string) data_get($resource, 'amount.currency_code'))];
    }

    private function razorpayDetails(string $type, array $payload): array
    {
        $payment = data_get($payload, 'payload.payment.entity', []);
        $state = in_array($type, ['payment.captured', 'order.paid'], true) ? 'paid' : ($type === 'payment.failed' ? 'failed' : 'ignored');

        return [data_get($payment, 'notes.invoice_id'), data_get($payment, 'id'), $state, (float) data_get($payment, 'amount', 0) / 100, strtoupper((string) data_get($payment, 'currency'))];
    }
}
