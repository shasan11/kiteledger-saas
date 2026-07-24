<?php

namespace App\Services\Payments;

use App\Contracts\Payments\PaymentGatewayInterface;
use App\Jobs\SaaS\DeliverManualPaymentReceiptJob;
use App\Models\Central\PaymentTransaction;
use App\Models\Central\TenantInvoice;
use App\Services\SaaS\CentralNotificationService;
use App\Services\SaaS\PlatformSettingsService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ManualPaymentService implements PaymentGatewayInterface
{
    public function createPayment(TenantInvoice $invoice, array $context = []): array
    {
        $transaction = PaymentTransaction::create([
            'tenant_id' => $invoice->tenant_id, 'invoice_id' => $invoice->id, 'gateway' => 'manual',
            'amount' => $context['amount'] ?? $invoice->balance ?: $invoice->total, 'currency' => $invoice->currency,
            'status' => 'pending', 'payment_method' => $context['payment_method'] ?? 'bank_transfer',
            'idempotency_key' => $context['idempotency_key'] ?? null,
        ]);

        return ['transaction_id' => $transaction->id, 'status' => 'pending'];
    }

    public function markPaid(TenantInvoice $invoice, array $context = []): PaymentTransaction
    {
        return $this->record($invoice, $context);
    }

    public function record(TenantInvoice $invoice, array $context): PaymentTransaction
    {
        $settings = app(PlatformSettingsService::class);
        $amount = round((float) ($context['amount'] ?? 0), 2);
        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => 'The payment amount must be greater than zero.']);
        }
        if (strtoupper((string) ($context['currency'] ?? $invoice->currency)) !== strtoupper($invoice->currency)) {
            throw ValidationException::withMessages(['currency' => 'The payment currency must match the invoice currency.']);
        }

        $transaction = DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($invoice, $context, $settings, $amount): PaymentTransaction {
            $locked = TenantInvoice::lockForUpdate()->findOrFail($invoice->id);
            if ($existing = PaymentTransaction::where('idempotency_key', $context['idempotency_key'])->first()) {
                return $existing;
            }
            if (filled($context['reference'] ?? null) && PaymentTransaction::where('gateway', 'manual')->where('reference', $context['reference'])->exists()) {
                throw ValidationException::withMessages(['reference' => 'This payment reference has already been recorded.']);
            }

            $paid = round((float) PaymentTransaction::where('invoice_id', $locked->id)->where('status', 'success')->sum('amount'), 2);
            $balance = max(0, round((float) $locked->total - $paid, 2));
            if ($amount > $balance && ! $settings->get('billing.overpayments_enabled', false)) {
                throw ValidationException::withMessages(['amount' => 'The payment exceeds the outstanding invoice balance.']);
            }
            if ($amount < $balance && ! $settings->get('billing.partial_payments_enabled', true)) {
                throw ValidationException::withMessages(['amount' => 'Partial payments are disabled.']);
            }

            $transaction = PaymentTransaction::create([
                'tenant_id' => $locked->tenant_id, 'invoice_id' => $locked->id, 'gateway' => 'manual',
                'amount' => $amount, 'currency' => $locked->currency, 'status' => 'success',
                'payment_method' => $context['payment_method'] ?? 'bank_transfer', 'reference' => $context['reference'],
                'bank_reference' => $context['bank_reference'] ?? null, 'notes' => $context['notes'] ?? null,
                'proof_disk' => $context['proof_disk'] ?? null, 'proof_path' => $context['proof_path'] ?? null,
                'added_by' => $context['added_by'] ?? null, 'idempotency_key' => $context['idempotency_key'],
                'receipt_sent' => false, 'paid_at' => $context['payment_date'] ?? now(),
                'raw_response' => ['source' => 'central_admin'],
            ]);
            $newPaid = round($paid + $amount, 2);
            $newBalance = max(0, round((float) $locked->total - $newPaid, 2));
            $locked->update([
                'paid_amount' => $newPaid, 'balance' => $newBalance,
                'status' => $newBalance <= 0 ? 'paid' : ($newPaid > 0 ? 'partially_paid' : 'unpaid'),
                'paid_at' => $newBalance <= 0 ? now() : null,
            ]);
            app(CentralNotificationService::class)->notify('manual_payment_recorded', 'billing', 'success', 'Manual payment recorded', $locked->invoice_number.' received '.$amount.' '.$locked->currency, route('central.payments.index'), $transaction);

            return $transaction;
        }, 3);

        if (($context['send_receipt'] ?? false) && ! $transaction->receipt_sent) {
            $job = new DeliverManualPaymentReceiptJob($transaction->id);
            if (app()->environment('testing') || ! $settings->get('queue_scheduler.queue_enabled', true)) {
                dispatch_sync($job);
            } else {
                dispatch($job);
            }
        }

        return $transaction;
    }

    public function refund(string $transactionId, float $amount): array
    {
        $transaction = PaymentTransaction::findOrFail($transactionId);
        if ($amount <= 0 || $transaction->refunded_amount + $amount > $transaction->amount) {
            throw ValidationException::withMessages(['amount' => 'The refund amount is invalid.']);
        }

        return ['status' => 'succeeded', 'amount' => $amount, 'id' => 'manual-'.$transaction->id.'-'.now()->timestamp];
    }

    public function verifyWebhook(array $payload, array $headers = []): bool
    {
        return false;
    }
}
