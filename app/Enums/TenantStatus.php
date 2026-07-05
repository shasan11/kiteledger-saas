<?php

namespace App\Enums;

enum TenantStatus: string
{
    case Pending = 'pending';
    case Provisioning = 'provisioning';
    case Active = 'active';
    case Suspended = 'suspended';
    case ProvisioningFailed = 'provisioning_failed';
    case Archived = 'archived';
    case DeletionPending = 'deletion_pending';

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, match ($this) {
            self::Pending => [self::Provisioning, self::Archived],
            self::Provisioning => [self::Active, self::ProvisioningFailed],
            self::ProvisioningFailed => [self::Provisioning, self::Archived],
            self::Active => [self::Suspended, self::Archived, self::DeletionPending],
            self::Suspended => [self::Active, self::Archived, self::DeletionPending],
            self::Archived => [self::Active, self::DeletionPending],
            self::DeletionPending => [self::Archived],
        }, true);
    }
}
