<?php

namespace App\Services\SaaS;

use App\Models\Central\Subscription;
use App\Models\Central\TenantInvoice;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BillingInvoiceService
{
    public function generate(Subscription $subscription, string $idempotencyKey): TenantInvoice
    {
        return DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($subscription, $idempotencyKey): TenantInvoice {
            if ($existing = TenantInvoice::where('idempotency_key', $idempotencyKey)->first()) {
                return $existing;
            }
            $subscription = Subscription::with(['tenant', 'plan'])->lockForUpdate()->findOrFail($subscription->id);
            $amount = $subscription->billing_cycle === 'yearly' ? $subscription->plan->price_yearly : $subscription->plan->price_monthly;
            $invoice = TenantInvoice::create([
                'invoice_number' => 'KL-'.now()->format('Y').'-'.Str::upper(substr((string) Str::ulid(), -10)),
                'tenant_id' => $subscription->tenant_id, 'subscription_id' => $subscription->id, 'plan_id' => $subscription->plan_id,
                'subtotal' => $amount, 'discount' => 0, 'tax' => 0, 'total' => $amount, 'currency' => $subscription->plan->currency,
                'status' => 'issued', 'issue_date' => today(), 'due_date' => $subscription->current_period_ends_at,
                'period_start' => $subscription->current_period_starts_at, 'period_end' => $subscription->current_period_ends_at,
                'billing_identity' => ['company_name' => $subscription->tenant->company_name, 'legal_name' => $subscription->tenant->legal_name, 'email' => $subscription->tenant->owner_email, 'address' => $subscription->tenant->address, 'country' => $subscription->tenant->country],
                'idempotency_key' => $idempotencyKey, 'locked_at' => now(),
            ]);
            $invoice->lines()->create(['type' => 'plan', 'description' => $subscription->plan->name.' ('.$subscription->billing_cycle.')', 'quantity' => 1, 'unit_amount' => $amount, 'amount' => $amount]);

            return $invoice->load('lines');
        });
    }
}
