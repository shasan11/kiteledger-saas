<?php

namespace App\Enums;

enum SubscriptionStatus: string
{
    case Trialing = 'trialing';
    case Active = 'active';
    case PastDue = 'past_due';
    case GracePeriod = 'grace_period';
    case Cancelled = 'cancelled';
    case Expired = 'expired';
    case Paused = 'paused';
    case Incomplete = 'incomplete';

    public function grantsAccess(): bool
    {
        return in_array($this, [self::Trialing, self::Active, self::GracePeriod], true);
    }
}
