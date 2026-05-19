<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'hrm.roles.view',
            'hrm.roles.create',
            'hrm.roles.update',
            'hrm.roles.delete',
            'hrm.permissions.view',
            'hrm.permissions.create',
            'hrm.permissions.update',
            'hrm.permissions.delete',
            'hrm.role_permissions.view',
            'hrm.role_permissions.update',
            'hrm.users.view',
            'hrm.users.create',
            'hrm.users.update',
            'hrm.users.delete',
            'hrm.payroll.view',
            'hrm.payroll.create',
            'hrm.payroll.update',
            'hrm.payroll.delete',
            'hrm.payroll.generate',
            'hrm.payroll.review',
            'hrm.payroll.approve',
            'hrm.payroll.process',
            'hrm.payroll.pay',
            'hrm.payroll.lock',
            'hrm.payroll.void',
            'hrm.payroll.settings.view',
            'hrm.payroll.settings.update',
            'hrm.payroll.salary_components.view',
            'hrm.payroll.salary_components.create',
            'hrm.payroll.salary_components.update',
            'hrm.payroll.salary_components.delete',
            'hrm.payroll.salary_structures.view',
            'hrm.payroll.salary_structures.create',
            'hrm.payroll.salary_structures.update',
            'hrm.payroll.salary_structures.delete',
            'hrm.payslips.view',
            'hrm.payslips.create',
            'hrm.payslips.update',
            'hrm.payslips.delete',
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

        $roles = Role::query()
            ->whereIn('name', ['Super Admin', 'Company Owner', 'Full Access Admin', 'Full Access User', 'Admin', 'super-admin', 'admin'])
            ->get();

        foreach ($permissions as $name) {
            $permission = Permission::query()->firstOrCreate(
                ['name' => $name, 'guard_name' => 'web'],
                ['guard_name' => 'web', 'description' => ucwords(str_replace(['.', '-'], ' ', $name)), 'active' => true, 'is_system_generated' => true]
            );

            foreach ($roles as $role) {
                $role->givePermissionTo($permission);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
