<?php

namespace App\Services\SaaS;

use App\Contracts\SaaS\SubscriptionLifecycle;
use App\Enums\SubscriptionStatus;
use App\Models\Central\Plan;
use App\Models\Central\Subscription;
use App\Models\Central\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubscriptionService implements SubscriptionLifecycle
{
    public function start(Tenant $tenant, Plan $plan, string $cycle = 'monthly', ?string $idempotencyKey = null): Subscription
    {
        if (! in_array($cycle, ['monthly', 'yearly'], true)) {
            throw ValidationException::withMessages(['billing_cycle' => 'Billing cycle must be monthly or yearly.']);
        }

        return DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($tenant, $plan, $cycle, $idempotencyKey): Subscription {
            if ($idempotencyKey && ($existing = Subscription::where('idempotency_key', $idempotencyKey)->first())) {
                return $existing;
            }
            $now = now();
            $trialEnd = $plan->trial_days ? $now->copy()->addDays($plan->trial_days) : null;
            $subscription = Subscription::query()->create(['tenant_id' => $tenant->id, 'plan_id' => $plan->id, 'status' => $trialEnd ? SubscriptionStatus::Trialing->value : SubscriptionStatus::Active->value, 'billing_cycle' => $cycle, 'starts_at' => $now, 'trial_ends_at' => $trialEnd, 'current_period_starts_at' => $now, 'current_period_ends_at' => $cycle === 'yearly' ? $now->copy()->addYear() : $now->copy()->addMonth(), 'idempotency_key' => $idempotencyKey]);
            $tenant->update(['plan_id' => $plan->id, 'trial_ends_at' => $trialEnd, 'subscription_ends_at' => $subscription->current_period_ends_at]);
            $this->audit($subscription, null, $subscription->status, $idempotencyKey);

            return $subscription;
        });
    }

    public function changePlan(Subscription $subscription, Plan $plan, bool $immediate = false): Subscription
    {
        return $this->locked($subscription, function (Subscription $locked) use ($plan, $immediate): void {
            if ($immediate) {
                $old = $locked->plan_id;
                $locked->plan_id = $plan->id;
                $locked->tenant()->update(['plan_id' => $plan->id]);
                $locked->metadata = array_merge($locked->metadata ?? [], ['previous_plan_id' => $old, 'proration_policy' => 'remaining_time_credit']);
            } else {
                $locked->scheduled_plan_id = $plan->id;
                $locked->scheduled_change_at = $locked->current_period_ends_at;
            }
        });
    }

    public function cancel(Subscription $subscription, bool $immediate = false): Subscription
    {
        return $this->locked($subscription, function (Subscription $locked) use ($immediate): void {
            $locked->cancelled_at = now();
            if ($immediate) {
                $locked->status = SubscriptionStatus::Cancelled->value;
                $locked->ends_at = now();
            } else {
                $locked->cancel_at_period_end = true;
            }
        });
    }

    public function reactivate(Subscription $subscription): Subscription
    {
        return $this->locked($subscription, function (Subscription $locked): void {
            if (! in_array($locked->status, [SubscriptionStatus::Cancelled->value, SubscriptionStatus::Paused->value, SubscriptionStatus::PastDue->value], true)) {
                throw ValidationException::withMessages(['status' => 'This subscription cannot be reactivated.']);
            }
            $locked->status = SubscriptionStatus::Active->value;
            $locked->cancel_at_period_end = false;
            $locked->cancelled_at = null;
            $locked->ends_at = null;
            $locked->paused_at = null;
        });
    }

    public function pause(Subscription $subscription, ?\DateTimeInterface $resumeAt = null): Subscription
    {
        return $this->locked($subscription, function (Subscription $locked) use ($resumeAt): void {
            $locked->status = SubscriptionStatus::Paused->value;
            $locked->paused_at = now();
            $locked->resume_at = $resumeAt;
        });
    }

    public function renew(Subscription $subscription): Subscription
    {
        return $this->locked($subscription, function (Subscription $locked): void {
            if ($locked->scheduled_plan_id) {
                $locked->plan_id = $locked->scheduled_plan_id;
                $locked->tenant()->update(['plan_id' => $locked->scheduled_plan_id]);
                $locked->scheduled_plan_id = null;
                $locked->scheduled_change_at = null;
            }
            $start = $locked->current_period_ends_at?->isFuture() ? $locked->current_period_ends_at->copy() : now();
            $locked->current_period_starts_at = $start;
            $locked->current_period_ends_at = $locked->billing_cycle === 'yearly' ? $start->copy()->addYear() : $start->copy()->addMonth();
            $locked->status = SubscriptionStatus::Active->value;
            $locked->cancel_at_period_end = false;
        });
    }

    private function locked(Subscription $subscription, callable $mutation): Subscription
    {
        return DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($subscription, $mutation): Subscription {
            $locked = Subscription::lockForUpdate()->findOrFail($subscription->id);
            $from = $locked->status;
            $mutation($locked);
            $locked->version++;
            $locked->save();
            $this->audit($locked, $from, $locked->status);

            return $locked->refresh();
        });
    }

    private function audit(Subscription $subscription, ?string $from, string $to, ?string $key = null): void
    {
        DB::connection(config('tenancy.database.central_connection'))->table('saas_lifecycle_transitions')->insertOrIgnore(['tenant_id' => $subscription->tenant_id, 'subject_type' => Subscription::class, 'subject_id' => (string) $subscription->id, 'from_state' => $from, 'to_state' => $to, 'idempotency_key' => $key, 'created_at' => now()]);
    }
}
