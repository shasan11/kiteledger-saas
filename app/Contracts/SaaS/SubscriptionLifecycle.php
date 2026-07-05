<?php

namespace App\Contracts\SaaS;

use App\Models\Central\Plan;
use App\Models\Central\Subscription;
use App\Models\Central\Tenant;

interface SubscriptionLifecycle
{
    public function start(Tenant $tenant, Plan $plan, string $cycle = 'monthly', ?string $idempotencyKey = null): Subscription;

    public function changePlan(Subscription $subscription, Plan $plan, bool $immediate = false): Subscription;

    public function cancel(Subscription $subscription, bool $immediate = false): Subscription;

    public function reactivate(Subscription $subscription): Subscription;

    public function pause(Subscription $subscription, ?\DateTimeInterface $resumeAt = null): Subscription;

    public function renew(Subscription $subscription): Subscription;
}
