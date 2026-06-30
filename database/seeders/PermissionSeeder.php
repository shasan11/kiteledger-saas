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
            'hrm.payroll.reopen',
            'hrm.payroll.void',
            'hrm.payroll.reverse',
            'hrm.payroll.report',
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
            'payroll.view',
            'payroll.create',
            'payroll.preview',
            'payroll.generate',
            'payroll.approve',
            'payroll.process',
            'payroll.pay',
            'payroll.lock',
            'payroll.reopen',
            'payroll.void',
            'payroll.reverse',
            'payroll.report',
            'payslip.view',
            'payslip.update',
            'payslip.download',
            'payroll_period.view',
            'payroll_period.manage',
            'payroll_component.view',
            'payroll_component.manage',
            'reports.view',
            'reports.export',
            'reports.ai_summary',
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
            'ai.settings.view',
            'ai.settings.update',
            'campaign.view',
            'campaign.create',
            'campaign.update',
            'campaign.delete',
            'campaign.send',
            'campaign.schedule',
            'campaign.cancel',
            'campaign.retry',
            'campaign.export',
            'campaign.attachment.upload',
            'campaign.attachment.delete',
            'campaign.log.view',
            'sms_config.view',
            'sms_config.create',
            'sms_config.update',
            'sms_config.delete',
            'sms_config.test',
            'sms_config.set_default',
            'sms_config.manage',
            'email_template.view',
            'email_template.update',
            'email_template.preview',
            'email_template.test',
            'printing_template.view',
            'printing_template.update',
            'printing_template.preview',
            'reporting_tag.view',
            'reporting_tag.create',
            'reporting_tag.update',
            'reporting_tag.delete',
            'reporting_tag.manage',
            'branch.switch',
            'fiscal_year.switch',
            'sms_template.view',
            'sms_template.create',
            'sms_template.update',
            'sms_template.delete',
            'sms_log.view',
            'sms_log.retry',
            'sms_log.export',
            'sms.send',
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
