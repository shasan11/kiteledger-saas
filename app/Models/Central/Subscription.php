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

        return $status?->grantsAccess() === true
            && (! $this->ends_at || $this->ends_at->isFuture())
            && ($status !== SubscriptionStatus::GracePeriod || $this->grace_ends_at?->isFuture());
    }
}
