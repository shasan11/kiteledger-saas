<?php

namespace App\Enums;

enum TenantStatus: string
{
    case Pending = 'pending';
    case Provisioning = 'provisioning';
    case DatabaseCreating = 'database_creating';
    case DatabaseCreated = 'database_created';
    case Migrating = 'migrating';
    case Seeding = 'seeding';
    case Active = 'active';
    case Suspended = 'suspended';
    case Failed = 'failed';
    case Deleting = 'deleting';
    case Deleted = 'deleted';
    case ProvisioningFailed = 'provisioning_failed';
    case Archived = 'archived';
    case DeletionPending = 'deletion_pending';

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, match ($this) {
            self::Pending => [self::Provisioning, self::Archived],
            self::Provisioning => [self::DatabaseCreating, self::DatabaseCreated, self::Active, self::Failed, self::ProvisioningFailed],
            self::DatabaseCreating => [self::DatabaseCreated, self::Failed],
            self::DatabaseCreated => [self::Migrating, self::Failed],
            self::Migrating => [self::Seeding, self::Failed],
            self::Seeding => [self::Active, self::Failed],
            self::Failed => [self::Provisioning, self::Deleting],
            self::Deleting => [self::Deleted, self::Failed],
            self::Deleted => [],
            self::ProvisioningFailed => [self::Provisioning, self::Archived],
            self::Active => [self::Suspended, self::Archived, self::DeletionPending],
            self::Suspended => [self::Active, self::Archived, self::DeletionPending],
            self::Archived => [self::Active, self::DeletionPending],
            self::DeletionPending => [self::Archived],
        }, true);
    }
}
