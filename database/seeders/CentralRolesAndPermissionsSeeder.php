<?php

namespace Database\Seeders;

use App\Models\Central\CentralAdmin;
use App\Models\Central\CentralPermission;
use App\Models\Central\CentralRole;
use Illuminate\Database\Seeder;

class CentralRolesAndPermissionsSeeder extends Seeder
{
    public const PERMISSIONS = [
        'dashboard.view',
        'tenant.view', 'tenant.create', 'tenant.update', 'tenant.suspend', 'tenant.reactivate', 'tenant.impersonate', 'tenant.delete', 'tenant.manage_domains', 'tenant.manage_features',
        'plan.view', 'plan.manage', 'feature.view', 'feature.manage', 'feature_override.manage',
        'subscription.view', 'subscription.manage', 'invoice.view', 'invoice.manage', 'invoice.customize', 'payment.view', 'payment.add_manual', 'payment.refund', 'gateway.view', 'gateway.manage',
        'cms.view', 'cms.manage', 'cms.publish', 'media.manage', 'lead.view', 'lead.manage', 'blog.view', 'blog.manage', 'seo.manage', 'website.branding.manage',
        'ticket.view', 'ticket.assign', 'ticket.reply', 'ticket.update', 'ticket.close', 'ticket.delete', 'support.manage',
        'settings.view', 'settings.manage', 'notifications.manage', 'admin.manage', 'role.manage', 'audit.view', 'system_health.view',
        'platform-users.view', 'platform-users.create', 'platform-users.update', 'platform-users.suspend',
        'tenant-memberships.view', 'tenant-memberships.manage', 'tenant-billing.view', 'tenant-billing.manage', 'tenant-plan.manage',
        'communication.view', 'communication.manage', 'communication.send', 'communication.import', 'communication.export', 'communication.retry',
    ];

    public function run(): void
    {
        $permissionIds = collect(self::PERMISSIONS)->mapWithKeys(function (string $name): array {
            $permission = CentralPermission::firstOrCreate(['name' => $name], ['label' => str($name)->replace('.', ' ')->title()]);

            return [$name => $permission->id];
        });

        $roles = [
            'super_administrator' => ['Super Administrator', ['*']],
            'platform_administrator' => ['Platform Administrator', self::PERMISSIONS],
            'billing_administrator' => ['Billing Administrator', ['dashboard.view', 'tenant.view', 'plan.view', 'subscription.view', 'subscription.manage', 'invoice.view', 'invoice.manage', 'invoice.customize', 'payment.view', 'payment.add_manual', 'payment.refund', 'gateway.view', 'gateway.manage', 'audit.view', 'platform-users.view', 'tenant-memberships.view', 'tenant-billing.view', 'tenant-billing.manage', 'tenant-plan.manage']],
            'support_manager' => ['Support Manager', ['dashboard.view', 'tenant.view', 'subscription.view', 'invoice.view', 'payment.view', 'ticket.view', 'ticket.assign', 'ticket.reply', 'ticket.update', 'ticket.close', 'ticket.delete', 'support.manage', 'platform-users.view', 'tenant-memberships.view']],
            'support_agent' => ['Support Agent', ['dashboard.view', 'tenant.view', 'ticket.view', 'ticket.reply', 'ticket.update', 'ticket.close']],
            'content_manager' => ['Content Manager', ['dashboard.view', 'cms.view', 'cms.manage', 'cms.publish', 'media.manage', 'lead.view', 'lead.manage', 'blog.view', 'blog.manage', 'seo.manage', 'website.branding.manage', 'communication.view', 'communication.manage', 'communication.send', 'communication.import', 'communication.export']],
            'operations_administrator' => ['Operations Administrator', ['dashboard.view', 'tenant.view', 'tenant.create', 'tenant.update', 'tenant.suspend', 'tenant.reactivate', 'tenant.manage_domains', 'tenant.manage_features', 'feature.view', 'feature.manage', 'feature_override.manage', 'system_health.view', 'audit.view', 'platform-users.view', 'platform-users.create', 'platform-users.update', 'platform-users.suspend', 'tenant-memberships.view', 'tenant-memberships.manage']],
            'read_only_auditor' => ['Read-only Auditor', ['dashboard.view', 'tenant.view', 'plan.view', 'feature.view', 'subscription.view', 'invoice.view', 'payment.view', 'gateway.view', 'cms.view', 'lead.view', 'blog.view', 'ticket.view', 'settings.view', 'audit.view', 'system_health.view', 'platform-users.view', 'tenant-memberships.view', 'tenant-billing.view']],
        ];

        $superRoleId = null;

        foreach ($roles as $name => [$label, $permissions]) {
            $role = CentralRole::updateOrCreate(['name' => $name], ['label' => $label]);
            $names = $permissions === ['*'] ? self::PERMISSIONS : $permissions;
            $role->permissions()->sync(collect($names)->map(fn (string $permission) => $permissionIds[$permission])->all());

            if ($name === 'super_administrator') {
                $superRoleId = $role->id;
            }
        }

        // Super administrators created by an installer before the role was
        // attached automatically would otherwise carry no role at all.
        if ($superRoleId) {
            CentralAdmin::query()
                ->where('role', 'super_admin')
                ->whereDoesntHave('roles')
                ->get()
                ->each(fn (CentralAdmin $admin) => $admin->roles()->syncWithoutDetaching([$superRoleId]));
        }
    }
}
