<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'reports.view',
            'reports.export',
            'reports.financial.view',
            'reports.sales.view',
            'reports.purchase.view',
            'reports.inventory.view',
            'reports.tax.view',
            'reports.pos.view',
            'reports.crm.view',
            'reports.hrm.view',
            'reports.system.view',
            'reports.analytics.view',
        ];

        $roles = Role::query()->whereIn('name', ['Super Admin', 'Admin', 'super-admin', 'admin'])->get();

        foreach ($permissions as $name) {
            $permission = Permission::query()->firstOrCreate(
                ['name' => $name],
                ['guard_name' => 'web', 'description' => ucwords(str_replace(['.', '-'], ' ', $name)), 'active' => true, 'is_system_generated' => true]
            );

            foreach ($roles as $role) {
                $role->givePermissionTo($permission);
            }
        }
    }
}
