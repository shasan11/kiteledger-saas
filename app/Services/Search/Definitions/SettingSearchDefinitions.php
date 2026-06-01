<?php

namespace App\Services\Search\Definitions;

class SettingSearchDefinitions
{
    public static function items(): array
    {
        $tabs = [
            ['Settings', null, ['configuration', 'admin']],
            ['Company Profile', 'company-profile', ['company', 'profile']],
            ['Localization', 'localization', ['timezone', 'date format', 'language']],
            ['Branches', 'branches', ['branch', 'office']],
            ['Fiscal Years', 'fiscal-years', ['financial year', 'fy', 'locked', 'closed']],
            ['Currencies', 'currencies', ['money', 'currency']],
            ['Taxes', 'taxes', ['vat', 'tax rate']],
            ['Approval Workflows', 'approval-workflows', ['workflow', 'approval']],
            ['Email Configuration', 'email-configuration', ['smtp', 'mail']],
            ['SMS Configuration', 'sms-configuration', ['sms', 'text message', 'provider']],
            ['Email Templates', 'email-templates', ['mail templates']],
            ['Accounting Configuration', 'accounting-configuration', ['ledger', 'accounts']],
            ['HRM Configuration', 'hrm-configuration', ['employee defaults']],
            ['Inventory Configuration', 'inventory-configuration', ['stock settings']],
            ['Sales Configuration', 'sales-configuration', ['invoice defaults']],
            ['Purchase Configuration', 'purchase-configuration', ['purchase defaults']],
            ['Users', 'users', ['staff', 'login']],
            ['Roles', 'roles', ['rbac']],
            ['Permissions', 'permissions', ['access']],
            ['Alert Types', 'alert-types', ['notification']],
            ['Reporting Tags', 'reporting-tags', ['tags']],
            ['Document Numberings', 'document-numberings', ['number series', 'prefix']],
            ['Printing Templates', 'printing-templates', ['print', 'pdf']],
            ['Custom Templates', 'custom-templates', ['template']],
            ['Application Settings', 'application-settings', ['app settings']],
            ['General Settings', 'general-settings', ['general']],
            ['Master Data', 'master-data', ['master setup']],
        ];

        return array_map(fn (array $item) => [
            'module_key' => 'settings',
            'module' => 'Settings',
            'title' => $item[0],
            'url' => $item[1] ? "/settings?tab={$item[1]}" : '/settings',
            'keywords' => $item[2],
            'permission' => 'settings.view',
            'icon' => 'setting',
        ], $tabs);
    }
}
