<?php

namespace App\Services\SaaS;

use App\Models\Central\PaymentTransaction;
use App\Models\Central\TenantInvoice;

class InvoicePaymentReconciler
{
    public function reconcile(TenantInvoice $invoice): TenantInvoice
    {
        $locked = TenantInvoice::lockForUpdate()->findOrFail($invoice->id);
        $net = PaymentTransaction::where('invoice_id', $locked->id)->whereIn('status', ['success', 'refunded'])->get()->sum(fn ($payment) => max(0, (float) $payment->amount - (float) $payment->refunded_amount));
        $paid = round((float) $net, 2);
        $balance = max(0, round((float) $locked->total - $paid, 2));
        $locked->update(['paid_amount' => $paid, 'balance' => $balance, 'status' => $balance <= 0 ? 'paid' : ($paid > 0 ? 'partially_paid' : 'unpaid'), 'paid_at' => $balance <= 0 ? ($locked->paid_at ?: now()) : null]);
        $locked = $locked->fresh();
        if ($balance <= 0 && $locked->subscription_id) {
            $subscription = $locked->subscription()->first();
            if ($subscription) {
                app(SubscriptionService::class)->renewForInvoice($subscription, $locked);
                $tenant = $subscription->tenant()->first();
                if ($tenant && in_array($tenant->status, ['suspended', 'expired'], true)) {
                    app(TenantSuspensionService::class)->reactivate($tenant);
                }
            }
        }

        return $locked->fresh();
    }
}
