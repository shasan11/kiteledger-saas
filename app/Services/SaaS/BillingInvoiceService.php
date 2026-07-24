<?php

namespace App\Services\SaaS;

use App\Models\Central\PlatformSetting;
use App\Models\Central\Subscription;
use App\Models\Central\TenantInvoice;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class BillingInvoiceService
{
    public function __construct(private readonly InvoiceNumberService $numbers) {}

    public function generate(Subscription $subscription, string $idempotencyKey): TenantInvoice
    {
        return DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($subscription, $idempotencyKey): TenantInvoice {
            if ($existing = TenantInvoice::where('idempotency_key', $idempotencyKey)->first()) {
                return $existing;
            }
            $subscription = Subscription::with(['tenant', 'plan'])->lockForUpdate()->findOrFail($subscription->id);
            $price = (float) ($subscription->billing_cycle === 'yearly' ? $subscription->plan->price_yearly : $subscription->plan->price_monthly);
            $settings = [];
            PlatformSetting::whereIn('group', ['company', 'billing', 'invoice_customization'])->get()->each(function (PlatformSetting $setting) use (&$settings): void {
                Arr::set($settings, $setting->key, $setting->safeValue());
            });
            $taxEnabled = (bool) data_get($settings, 'billing.tax_enabled', false);
            $taxRate = $taxEnabled ? max(0, (float) data_get($settings, 'billing.tax_rate', 0)) : 0;
            $pricesIncludeTax = $taxEnabled && (bool) data_get($settings, 'billing.prices_include_tax', false);
            $subtotal = $pricesIncludeTax && $taxRate > 0 ? round($price / (1 + ($taxRate / 100)), 2) : round($price, 2);
            $tax = $taxEnabled ? ($pricesIncludeTax ? round($price - $subtotal, 2) : round($subtotal * $taxRate / 100, 2)) : 0;
            $total = $pricesIncludeTax ? round($price, 2) : round($subtotal + $tax, 2);
            $buyer = ['company_name' => $subscription->tenant->company_name, 'legal_name' => $subscription->tenant->legal_name, 'email' => $subscription->tenant->owner_email, 'address' => $subscription->tenant->address, 'country' => $subscription->tenant->country];
            $lineSnapshot = [['type' => 'plan', 'description' => $subscription->plan->name.' ('.$subscription->billing_cycle.')', 'quantity' => 1, 'unit_amount' => $subtotal, 'amount' => $subtotal]];
            $invoice = TenantInvoice::create([
                'invoice_number' => $this->numbers->next($settings),
                'tenant_id' => $subscription->tenant_id, 'subscription_id' => $subscription->id, 'plan_id' => $subscription->plan_id,
                'subtotal' => $subtotal, 'discount' => 0, 'tax' => $tax, 'total' => $total, 'currency' => $subscription->plan->currency,
                'status' => 'issued', 'issue_date' => today(), 'due_date' => today()->addDays(max(0, (int) data_get($settings, 'billing.invoice_due_days', 14))),
                'period_start' => $subscription->current_period_starts_at, 'period_end' => $subscription->current_period_ends_at,
                'billing_identity' => $buyer, 'seller_snapshot' => $settings, 'buyer_snapshot' => $buyer,
                'tax_snapshot' => $settings, 'customization_snapshot' => $settings,
                'line_items_snapshot' => $lineSnapshot, 'paid_amount' => 0, 'balance' => $total,
                'notes' => data_get($settings, 'billing.default_invoice_notes'), 'idempotency_key' => $idempotencyKey, 'locked_at' => now(),
            ]);
            $invoice->lines()->create($lineSnapshot[0]);

            return $invoice->load('lines');
        });
    }
}
