<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

class SettingsPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'settings.view', 'settings.update', 'settings.company.view', 'settings.company.update',
            'settings.branches.manage', 'settings.fiscal-years.manage', 'settings.currencies.manage',
            'settings.taxes.manage', 'settings.document-series.manage', 'settings.approval-workflows.manage',
            'settings.email.manage', 'settings.localization.manage', 'settings.accounting.manage',
            'settings.hrm.manage', 'settings.inventory.manage', 'settings.roles.manage', 'settings.permissions.manage',
            'pos.view', 'pos.sell', 'pos.refund', 'pos.shift.open', 'pos.shift.close',
            'pos.terminal.manage', 'pos.cash_movement.manage', 'pos.reports.view',
        ];

        $adminRoles = $this->adminRoles();

        foreach ($permissions as $name) {
            $permission = Permission::query()->firstOrCreate(
                ['name' => $name],
                ['guard_name' => 'web', 'description' => ucwords(str_replace(['.', '-'], ' ', $name)), 'active' => true, 'is_system_generated' => true]
            );
            $permission->update(['guard_name' => $permission->guard_name ?: 'web']);

            $adminRoles->each(function (Role $role) use ($permission) {
                $role->update(['guard_name' => $role->guard_name ?: 'web']);
                $role->givePermissionTo($permission);
            });
        }
    }

    private function adminRoles(): Collection
    {
        $roles = Role::query()
            ->whereIn('name', ['Super Admin', 'Admin', 'super-admin', 'admin'])
            ->get();

        if ($roles->isNotEmpty()) {
            return $roles;
        }

        return collect([
            Role::query()->firstOrCreate(
                ['name' => 'Admin', 'guard_name' => 'web'],
                ['description' => 'System administrator', 'active' => true, 'is_system_generated' => true]
            ),
        ]);
    }
}
