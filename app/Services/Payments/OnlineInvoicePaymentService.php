<?php

namespace App\Services\Payments;

use App\Models\CustomerPayment;
use App\Models\CustomerPaymentLine;
use App\Models\Invoice;
use App\Models\InvoicePaymentLink;
use App\Models\OnlinePayment;
use App\Models\OnlinePaymentSetting;
use App\Services\TransactionApprovalService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OnlineInvoicePaymentService
{
    public function generatePaymentLink(Invoice $invoice): InvoicePaymentLink
    {
        return DB::transaction(function () use ($invoice) {
            $existing = InvoicePaymentLink::query()
                ->where('invoice_id', $invoice->id)
                ->where('active', true)
                ->first();

            if ($existing && $existing->isUsable()) {
                return $existing;
            }

            if ($existing) {
                $existing->forceFill(['active' => false])->saveQuietly();
            }

            $settings = OnlinePaymentSetting::current();
            $expiryDays = $settings->payment_link_expiry_days;

            return InvoicePaymentLink::create([
                'invoice_id' => $invoice->id,
                'public_token' => InvoicePaymentLink::generateToken(),
                'expires_at' => $expiryDays ? now()->addDays($expiryDays) : null,
                'active' => true,
            ]);
        });
    }

    public function disablePaymentLink(Invoice $invoice): void
    {
        InvoicePaymentLink::query()
            ->where('invoice_id', $invoice->id)
            ->where('active', true)
            ->update(['active' => false]);
    }

    public function getInvoiceByToken(string $token): ?Invoice
    {
        $link = InvoicePaymentLink::query()
            ->where('public_token', $token)
            ->where('active', true)
            ->first();

        if (!$link || !$link->isUsable()) {
            return null;
        }

        $link->touchAccess();

        return $link->invoice()->with([
            'contact',
            'currency',
            'invoiceLines.product',
        ])->first();
    }

    public function createPendingPayment(Invoice $invoice, string $provider, float $amount, string $token, array $customerInfo = []): OnlinePayment
    {
        return OnlinePayment::create([
            'invoice_id' => $invoice->id,
            'contact_id' => $invoice->contact_id,
            'provider' => $provider,
            'public_token' => $token,
            'amount' => $amount,
            'currency_id' => $invoice->currency_id,
            'currency_code' => $invoice->currency?->code ?? 'USD',
            'exchange_rate' => $invoice->exchange_rate ?? 1,
            'status' => OnlinePayment::STATUS_PENDING,
            'customer_name' => $customerInfo['name'] ?? $invoice->contact?->name,
            'customer_email' => $customerInfo['email'] ?? $invoice->contact?->email,
            'customer_phone' => $customerInfo['phone'] ?? $invoice->contact?->phone,
            'active' => true,
        ]);
    }

    public function fulfillSucceededPayment(OnlinePayment $onlinePayment, array $gatewayResult): void
    {
        DB::transaction(function () use ($onlinePayment, $gatewayResult) {
            // Lock for idempotency
            $fresh = OnlinePayment::query()
                ->whereKey($onlinePayment->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($fresh->isSucceeded()) {
                return; // Already processed
            }

            $fresh->forceFill([
                'status' => OnlinePayment::STATUS_SUCCEEDED,
                'provider_payment_id' => $gatewayResult['payment_id'] ?? $fresh->provider_payment_id,
                'provider_order_id' => $gatewayResult['order_id'] ?? $fresh->provider_order_id,
                'raw_response' => $gatewayResult['raw'] ?? null,
                'verified_at' => now(),
                'paid_at' => now(),
            ])->save();

            $invoice = $fresh->invoice()->lockForUpdate()->firstOrFail();

            if ((bool) $invoice->void || $invoice->status === 'void') {
                return;
            }

            // Create CustomerPayment
            $payment = CustomerPayment::create([
                'branch_id' => $invoice->branch_id,
                'fiscal_year_id' => $invoice->fiscal_year_id,
                'payment_date' => now()->toDateString(),
                'contact_id' => $invoice->contact_id,
                'currency_id' => $invoice->currency_id,
                'exchange_rate' => $invoice->exchange_rate ?? 1,
                'amount' => $fresh->amount,
                'total' => $fresh->amount,
                'payment_method' => 'online',
                'reference' => $gatewayResult['payment_id'] ?? $fresh->provider_payment_id ?? $fresh->id,
                'notes' => strtoupper($fresh->provider) . ' online payment | Ref: ' . ($gatewayResult['payment_id'] ?? ''),
                'status' => 'draft',
                'active' => true,
                'approved' => false,
            ]);

            CustomerPaymentLine::create([
                'customer_payment_id' => $payment->id,
                'invoice_id' => $invoice->id,
                'allocated_amount' => $fresh->amount,
            ]);

            // Link and approve
            $fresh->forceFill(['customer_payment_id' => $payment->id])->save();

            app(TransactionApprovalService::class)->approve($payment);
        });
    }

    public function markFailed(OnlinePayment $onlinePayment, string $reason = ''): void
    {
        $onlinePayment->forceFill([
            'status' => OnlinePayment::STATUS_FAILED,
            'failed_reason' => $reason,
        ])->save();
    }

    public function markCancelled(OnlinePayment $onlinePayment): void
    {
        $onlinePayment->forceFill([
            'status' => OnlinePayment::STATUS_CANCELLED,
        ])->save();
    }

    public function validatePaymentAmount(Invoice $invoice, float $amount, OnlinePaymentSetting $settings): void
    {
        $invoice->recalculatePaymentTotals();
        $balanceDue = (float) $invoice->balance_due;

        if ($balanceDue <= 0) {
            throw new \RuntimeException('This invoice has no outstanding balance.');
        }

        if (!$settings->allow_partial_invoice_payment && $amount < $balanceDue) {
            throw new \RuntimeException('Partial payments are not allowed. Please pay the full amount: ' . number_format($balanceDue, 2));
        }

        if ($settings->allow_partial_invoice_payment && $settings->minimum_partial_payment_amount) {
            if ($amount < (float) $settings->minimum_partial_payment_amount) {
                throw new \RuntimeException('Minimum payment amount is ' . number_format((float) $settings->minimum_partial_payment_amount, 2));
            }
        }

        if (!$settings->allow_invoice_overpayment && $amount > round($balanceDue + 0.01, 2)) {
            throw new \RuntimeException('Payment amount cannot exceed the invoice balance due: ' . number_format($balanceDue, 2));
        }
    }
}
