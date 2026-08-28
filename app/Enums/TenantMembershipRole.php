<?php

namespace App\Enums;

/**
 * Platform-level role a central (customer) user holds inside one tenant.
 * Roles seed the granular permission flags stored on the membership row;
 * an administrator may then override any individual flag.
 */
enum TenantMembershipRole: string
{
    case Owner = 'owner';
    case Administrator = 'administrator';
    case BillingManager = 'billing_manager';
    case Member = 'member';
    case Viewer = 'viewer';

    public const PERMISSIONS = [
        'can_access_tenant',
        'can_manage_users',
        'can_manage_billing',
        'can_manage_plan',
        'can_view_invoices',
        'can_make_payments',
        'can_manage_company',
        'can_manage_integrations',
    ];

    public function label(): string
    {
        return match ($this) {
            self::Owner => 'Owner',
            self::Administrator => 'Administrator',
            self::BillingManager => 'Billing Manager',
            self::Member => 'Member',
            self::Viewer => 'Viewer',
        };
    }

    public function isReadOnly(): bool
    {
        return $this === self::Viewer;
    }

    /**
     * @return array<string, bool>
     */
    public function defaultPermissions(): array
    {
        $granted = match ($this) {
            self::Owner => self::PERMISSIONS,
            self::Administrator => ['can_access_tenant', 'can_manage_users', 'can_manage_billing', 'can_view_invoices', 'can_manage_company', 'can_manage_integrations'],
            self::BillingManager => ['can_access_tenant', 'can_manage_billing', 'can_view_invoices', 'can_make_payments'],
            self::Member => ['can_access_tenant'],
            self::Viewer => ['can_access_tenant'],
        };

        return collect(self::PERMISSIONS)->mapWithKeys(fn (string $permission): array => [$permission => in_array($permission, $granted, true)])->all();
    }

    /**
     * @return array<int, array{value: string, label: string, permissions: array<string, bool>, read_only: bool}>
     */
    public static function options(): array
    {
        return array_map(fn (self $role): array => [
            'value' => $role->value,
            'label' => $role->label(),
            'permissions' => $role->defaultPermissions(),
            'read_only' => $role->isReadOnly(),
        ], self::cases());
    }

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
