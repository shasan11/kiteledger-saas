<?php

namespace App\Models\Central;

use App\Enums\SubscriptionStatus;

class Subscription extends CentralModel
{
    protected function casts(): array
    {
        return ['cancel_at_period_end' => 'boolean', 'starts_at' => 'datetime', 'trial_ends_at' => 'datetime', 'current_period_starts_at' => 'datetime', 'current_period_ends_at' => 'datetime', 'scheduled_change_at' => 'datetime', 'grace_ends_at' => 'datetime', 'paused_at' => 'datetime', 'resume_at' => 'datetime', 'cancelled_at' => 'datetime', 'ends_at' => 'datetime', 'metadata' => 'array'];
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }

    public function isValid(): bool
    {
        $status = SubscriptionStatus::tryFrom($this->status);
        if (! $status?->grantsAccess() || ! $this->starts_at || $this->starts_at->isFuture() || ($this->ends_at && ! $this->ends_at->isFuture())) {
            return false;
        }
        if ($status === SubscriptionStatus::Trialing) {
            return $this->trial_ends_at?->isFuture() === true;
        }
        if ($status === SubscriptionStatus::GracePeriod) {
            return $this->grace_ends_at?->isFuture() === true;
        }

        return ! $this->current_period_ends_at || $this->current_period_ends_at->isFuture();
    }
}
