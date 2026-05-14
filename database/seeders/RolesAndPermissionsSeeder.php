<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class RolesAndPermissionsSeeder extends Seeder
{
    protected string $guard = 'web';

    private const ALLOWED_ACTIONS = [
        'view',
        'create',
        'update',
        'delete',
        'manage',
        'approve',
        'void',
        'generate',
        'process',
        'review',
        'pay',
        'lock',
        'export',
        'download',
        'view-own',
    ];

    public function run(): void
    {
        if (class_exists(\Spatie\Permission\PermissionRegistrar::class)) {
            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        }

        DB::transaction(function () {
            $permissionNames = $this->buildPermissionNames();

            $this->pruneUnsupportedPermissions($permissionNames);

            $permissionIds = [];
            foreach ($permissionNames as $permissionName) {
                $permissionIds[$permissionName] = $this->upsertPermission($permissionName);
            }

            $roles = $this->roles();

            $roleIds = [];
            foreach ($roles as $roleName => $config) {
                $roleIds[$roleName] = $this->upsertRole($roleName);
            }

            foreach ($roles as $roleName => $config) {
                $matchedPermissionNames = $this->matchPermissions(
                    $permissionNames,
                    $config['allow'] ?? [],
                    $config['deny'] ?? []
                );

                $matchedPermissionIds = array_values(array_filter(
                    array_map(fn ($name) => $permissionIds[$name] ?? null, $matchedPermissionNames)
                ));

                $this->syncRolePermissions($roleIds[$roleName], $matchedPermissionIds);
            }

            $this->assignSuperAdminToFirstUser($roleIds['Super Admin'] ?? null);
        });

        if (class_exists(\Spatie\Permission\PermissionRegistrar::class)) {
            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        }
    }

    private function buildPermissionNames(): array
    {
        $definitions = [
            'system' => [
                'dashboard' => ['view'],
                'global_search' => ['use'],
                'activity_log' => ['view', 'delete'],
                'audit_log' => ['view', 'delete'],

                'user' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'assign_role',
                    'reset_password',
                    'change_status',
                ],

                'role' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'assign_permission',
                ],

                'permission' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'branch' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'change_status',
                ],

                'app_setting' => ['view', 'update'],
                'general_setting' => ['view', 'update'],
                'application_setting' => ['view', 'update'],

                'document_numbering' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'email_config' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'email_template' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'printing_template' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'custom_field' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'custom_template' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'announcement' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'alert_type' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'approval_workflow' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'manage',
                ],
            ],

            'master' => [
                'currency' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'fiscal_year' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'lock',
                    'set_current',
                ],

                'master_data' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'contact_group' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'contact' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'export',
                    'import',
                ],

                'credit_term' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'product_category' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'product_tax_category' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'product_unit' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'product' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'export',
                    'import',
                ],

                'product_variant' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'warehouse' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'reporting_tag' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],
            ],

            'accounting' => [
                'configuration' => ['view', 'update'],

                'chart_of_account' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'change_status',
                    'export',
                ],

                'account' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'bank_account' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'statement',
                    'reconcile',
                ],

                'journal_voucher' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'void',
                    'print',
                    'export',
                ],

                'cash_transfer' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'void',
                    'print',
                    'export',
                ],

                'cheque_register' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'clear',
                    'cancel',
                    'export',
                ],

                'expense' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'void',
                    'print',
                    'export',
                ],

                'loan_account' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'loan_top_up' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'void',
                    'print',
                    'export',
                ],

                'loan_charge' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'void',
                    'print',
                    'export',
                ],
            ],

            'sales' => [
                'configuration' => ['view', 'update'],

                'quotation' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'void',
                    'print',
                    'email',
                    'export',
                ],

                'proforma_invoice' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'void',
                    'print',
                    'email',
                    'export',
                ],

                'sales_order' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'void',
                    'print',
                    'email',
                    'export',
                ],

                'invoice' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'void',
                    'print',
                    'email',
                    'export',
                ],

                'sales_return' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'void',
                    'print',
                    'email',
                    'export',
                ],
            ],

            'receivable' => [
                'customer_payment' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'void',
                    'print',
                    'export',
                ],

                'customer_statement' => [
                    'view',
                    'export',
                    'print',
                    'email',
                ],
            ],

            'purchase' => [
                'configuration' => ['view', 'update'],

                'purchase_order' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'void',
                    'print',
                    'email',
                    'export',
                ],

                'purchase_bill' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'void',
                    'print',
                    'email',
                    'export',
                ],

                'debit_note' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'void',
                    'print',
                    'email',
                    'export',
                ],
            ],

            'payable' => [
                'supplier_payment' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'void',
                    'print',
                    'export',
                ],

                'supplier_statement' => [
                    'view',
                    'export',
                    'print',
                    'email',
                ],
            ],

            'inventory' => [
                'configuration' => ['view', 'update'],

                'stock' => [
                    'view',
                    'export',
                ],

                'stock_ledger' => [
                    'view',
                    'export',
                ],

                'inventory_adjustment' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'void',
                    'print',
                    'export',
                ],

                'warehouse_transfer' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'void',
                    'print',
                    'export',
                ],
            ],

            'pos' => [
                'terminal' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'shift' => [
                    'view',
                    'open',
                    'close',
                    'update',
                    'export',
                ],

                'sale' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'void',
                    'print',
                    'email',
                    'export',
                ],

                'payment' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'return' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'void',
                    'print',
                    'export',
                ],

                'cash_movement' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'export',
                ],
            ],

            'crm' => [
                'lead' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'assign',
                    'convert',
                    'export',
                    'import',
                ],

                'deal' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'assign',
                    'change_stage',
                    'mark_won',
                    'mark_lost',
                    'export',
                ],

                'pipeline' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'deal_stage' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'activity' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'assign',
                    'complete',
                ],

                'activity_comment' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],
            ],

            'hrm' => [
                'configuration' => ['view', 'update'],

                'department' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'designation' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'employment_status' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'employee' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'change_status',
                ],

                'employee_document' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'attendance' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'export',
                ],

                'leave_application' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'export',
                ],

                'leave_policy' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'shift' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'weekly_holiday' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'public_holiday' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'payslip' => [
                    'view',
                    'view-own',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'reject',
                    'download',
                    'print',
                    'export',
                ],

                'payroll' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'generate',
                    'review',
                    'approve',
                    'process',
                    'pay',
                    'lock',
                    'void',
                    'export',
                ],

                'payroll_period' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'salary_structure' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'manage',
                ],

                'reimbursement' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'approve',
                    'pay',
                ],

                'salary_history' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'award' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'award_history' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'onboarding_checklist' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'assign',
                    'complete',
                ],
            ],

            'project' => [
                'project' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'assign_manager',
                    'export',
                ],

                'team' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'assign_member',
                ],

                'milestone' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'task' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                    'assign',
                    'change_status',
                ],

                'task_status' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'priority' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],
            ],

            'tax' => [
                'tax_class' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'tax_rate' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'tax_rate_component' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'tax_jurisdiction' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'tax_registration' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'tax_rule' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],

                'tax_exemption' => [
                    'view',
                    'create',
                    'update',
                    'delete',
                ],
            ],

            'report.accounting' => [
                'transaction_list' => ['view', 'export'],
                'journal_report' => ['view', 'export'],
                'general_ledger_summary' => ['view', 'export'],
                'detail_general_ledger' => ['view', 'export'],
                'gl_master_report' => ['view', 'export'],
                'trial_balance' => ['view', 'export'],
                'income_statement' => ['view', 'export'],
                'balance_sheet' => ['view', 'export'],
                'cash_flow_summary' => ['view', 'export'],
            ],

            'report.receivable' => [
                'customer_receivable_summary' => ['view', 'export'],
                'customer_ageing_summary' => ['view', 'export'],
                'invoice_age' => ['view', 'export'],
                'customer_statement' => ['view', 'export'],
            ],

            'report.payable' => [
                'supplier_payable_summary' => ['view', 'export'],
                'supplier_ageing_summary' => ['view', 'export'],
                'purchase_bill_age' => ['view', 'export'],
                'supplier_statement' => ['view', 'export'],
            ],

            'report.sales' => [
                'sales_by_customer' => ['view', 'export'],
                'sales_by_item' => ['view', 'export'],
                'sales_by_customer_monthly' => ['view', 'export'],
                'sales_by_item_monthly' => ['view', 'export'],
                'sales_master' => ['view', 'export'],
                'sales_summary' => ['view', 'export'],
            ],

            'report.purchase' => [
                'purchase_by_supplier' => ['view', 'export'],
                'purchase_by_item' => ['view', 'export'],
                'purchase_by_supplier_monthly' => ['view', 'export'],
                'purchase_by_item_monthly' => ['view', 'export'],
                'purchase_master' => ['view', 'export'],
            ],

            'report.tax' => [
                'sales_register' => ['view', 'export'],
                'sales_return_register' => ['view', 'export'],
                'purchase_register' => ['view', 'export'],
                'purchase_return_register' => ['view', 'export'],
                'vat_summary' => ['view', 'export'],
                'tds' => ['view', 'export'],
                'annex_13' => ['view', 'export'],
                'annex_5_materialised' => ['view', 'export'],
            ],

            'report.inventory' => [
                'stock_summary' => ['view', 'export'],
                'stock_ledger' => ['view', 'export'],
                'low_stock' => ['view', 'export'],
                'inventory_valuation' => ['view', 'export'],
            ],

            'report.hrm' => [
                'attendance' => ['view', 'export'],
                'leave' => ['view', 'export'],
                'payroll' => ['view', 'export'],
                'employee' => ['view', 'export'],
            ],

            'self' => [
                'profile' => ['view', 'update'],
                'attendance' => ['view', 'create'],
                'leave' => ['view', 'create'],
                'payslip' => ['view', 'print'],
                'task' => ['view', 'update'],
            ],
        ];

        $permissions = [];

        foreach ($definitions as $module => $resources) {
            foreach ($resources as $resource => $actions) {
                foreach ($actions as $action) {
                    if (! in_array($action, self::ALLOWED_ACTIONS, true)) {
                        continue;
                    }

                    $permissions[] = "{$module}.{$resource}.{$action}";
                }
            }
        }

        $permissions = array_merge($permissions, [
            'branches.view-all',
            'settings.view',
            'settings.update',
            'settings.company.view',
            'settings.company.update',
            'settings.branches.manage',
            'settings.fiscal-years.manage',
            'settings.currencies.manage',
            'settings.taxes.manage',
            'settings.document-series.manage',
            'settings.approval-workflows.manage',
            'settings.email.manage',
            'settings.localization.manage',
            'settings.accounting.manage',
            'settings.hrm.manage',
            'settings.inventory.manage',
            'settings.roles.manage',
            'settings.permissions.manage',
            'settings.configuration.view',
            'settings.configuration.update',
            'system.settings.view',
            'system.settings.update',
            'configurations.view',
            'configurations.update',
            'payroll.view',
            'payroll.create',
            'payroll.update',
            'payroll.delete',
            'payroll.generate',
            'payroll.review',
            'payroll.approve',
            'payroll.process',
            'payroll.pay',
            'payroll.lock',
            'payroll.void',
            'payroll.export',
            'payroll-period.view',
            'payroll-period.create',
            'payroll-period.update',
            'payroll-period.delete',
            'payslip.view',
            'payslip.view-own',
            'payslip.download',
            'salary-structure.view',
            'salary-structure.manage',
            'reimbursement.view',
            'reimbursement.create',
            'reimbursement.approve',
            'reimbursement.pay',
            'crm.view',
            'crm.manage',
            'crm.leads.view',
            'crm.leads.create',
            'crm.leads.update',
            'crm.leads.convert',
            'crm.deals.view',
            'crm.deals.create',
            'crm.deals.update',
            'crm.deals.mark-won',
            'crm.deals.mark-lost',
            'crm.activities.view',
            'crm.activities.manage',
            'crm.accounts.view',
            'crm.accounts.manage',
            'crm.forecast.view',
            'crm.campaigns.view',
            'crm.campaigns.manage',
            'crm.communications.view',
            'crm.communications.manage',
        ]);

        sort($permissions);

        return array_values(array_unique($permissions));
    }

    private function pruneUnsupportedPermissions(array $allowedPermissionNames): void
    {
        if (! Schema::hasTable('permissions')) {
            return;
        }

        $unsupportedIds = DB::table('permissions')
            ->where('guard_name', $this->guard)
            ->where(function ($query) use ($allowedPermissionNames) {
                $query->whereNotIn('name', $allowedPermissionNames);

                foreach (self::ALLOWED_ACTIONS as $action) {
                    $query->where('name', 'not like', "%.{$action}");
                }
            })
            ->pluck('id')
            ->all();

        if (empty($unsupportedIds)) {
            return;
        }

        if (Schema::hasTable('role_has_permissions')) {
            DB::table('role_has_permissions')->whereIn('permission_id', $unsupportedIds)->delete();
        }

        if (Schema::hasTable('model_has_permissions')) {
            DB::table('model_has_permissions')->whereIn('permission_id', $unsupportedIds)->delete();
        }

        if (Schema::hasTable('role_permissions')) {
            DB::table('role_permissions')->whereIn('permission_id', $unsupportedIds)->delete();
        }

        DB::table('permissions')->whereIn('id', $unsupportedIds)->delete();
    }

    private function roles(): array
    {
        return [
            'Super Admin' => [
                'allow' => ['*'],
            ],

            'Company Owner' => [
                'allow' => ['*'],
                'deny' => [
                    'system.permission.create',
                    'system.permission.delete',
                    'system.activity_log.delete',
                    'system.audit_log.delete',
                ],
            ],

            'Branch Admin' => [
                'allow' => ['*'],
                'deny' => [
                    'system.permission.*',
                    'system.role.delete',
                    'system.app_setting.update',
                    'system.general_setting.update',
                    'system.application_setting.update',
                    '*.delete',
                ],
            ],

            'System Manager' => [
                'allow' => [
                    'system.*',
                    'master.currency.view',
                    'master.fiscal_year.view',
                    'master.master_data.*',
                    'report.*.view',
                    'report.*.export',
                ],
                'deny' => [
                    'system.audit_log.delete',
                    'system.activity_log.delete',
                ],
            ],

            'Auditor' => [
                'allow' => [
                    '*.view',
                    '*.export',
                    '*.print',
                    'system.activity_log.view',
                    'system.audit_log.view',
                ],
            ],

            'Finance Controller' => [
                'allow' => [
                    'accounting.*',
                    'receivable.*',
                    'payable.*',
                    'tax.*',
                    'report.accounting.*',
                    'report.receivable.*',
                    'report.payable.*',
                    'report.tax.*',
                    'master.currency.view',
                    'master.fiscal_year.view',
                    'master.contact.view',
                    'master.product.view',
                ],
            ],

            'Accountant' => [
                'allow' => [
                    'accounting.chart_of_account.view',
                    'accounting.chart_of_account.export',
                    'accounting.bank_account.view',
                    'accounting.bank_account.statement',
                    'accounting.journal_voucher.*',
                    'accounting.cash_transfer.*',
                    'accounting.cheque_register.*',
                    'accounting.expense.*',
                    'receivable.customer_payment.*',
                    'payable.supplier_payment.*',
                    'report.accounting.*',
                    'report.receivable.customer_statement.*',
                    'report.payable.supplier_statement.*',
                    'master.contact.view',
                    'master.product.view',
                ],
                'deny' => [
                    '*.delete',
                    '*.void',
                    '*.approve',
                    '*.reject',
                    'accounting.configuration.update',
                ],
            ],

            'Junior Accountant' => [
                'allow' => [
                    'accounting.journal_voucher.view',
                    'accounting.journal_voucher.create',
                    'accounting.journal_voucher.update',
                    'accounting.expense.view',
                    'accounting.expense.create',
                    'accounting.expense.update',
                    'receivable.customer_payment.view',
                    'receivable.customer_payment.create',
                    'payable.supplier_payment.view',
                    'payable.supplier_payment.create',
                    'master.contact.view',
                    'master.product.view',
                ],
            ],

            'Cashier / Treasurer' => [
                'allow' => [
                    'accounting.bank_account.view',
                    'accounting.bank_account.statement',
                    'accounting.cash_transfer.view',
                    'accounting.cash_transfer.create',
                    'accounting.cash_transfer.update',
                    'accounting.cheque_register.view',
                    'accounting.cheque_register.create',
                    'accounting.cheque_register.update',
                    'receivable.customer_payment.view',
                    'receivable.customer_payment.create',
                    'payable.supplier_payment.view',
                    'payable.supplier_payment.create',
                    'pos.cash_movement.*',
                ],
                'deny' => [
                    '*.delete',
                    '*.approve',
                    '*.reject',
                    '*.void',
                ],
            ],

            'Tax Officer' => [
                'allow' => [
                    'tax.*',
                    'report.tax.*',
                    'sales.invoice.view',
                    'purchase.purchase_bill.view',
                    'accounting.chart_of_account.view',
                    'master.contact.view',
                ],
                'deny' => [
                    '*.delete',
                ],
            ],

            'Finance Approver' => [
                'allow' => [
                    'accounting.*.view',
                    'accounting.*.approve',
                    'accounting.*.reject',
                    'accounting.*.void',
                    'receivable.*.view',
                    'receivable.*.approve',
                    'receivable.*.reject',
                    'receivable.*.void',
                    'payable.*.view',
                    'payable.*.approve',
                    'payable.*.reject',
                    'payable.*.void',
                    'hrm.payroll.view',
                    'hrm.payroll.approve',
                    'hrm.payroll.pay',
                    'hrm.payroll.void',
                    'payroll.view',
                    'payroll.approve',
                    'payroll.pay',
                    'payroll.void',
                    'report.accounting.*',
                ],
            ],

            'Sales Manager' => [
                'allow' => [
                    'sales.*',
                    'receivable.customer_payment.view',
                    'crm.*',
                    'report.sales.*',
                    'report.receivable.*',
                    'master.contact.*',
                    'master.product.view',
                ],
            ],

            'Sales Executive' => [
                'allow' => [
                    'sales.quotation.*',
                    'sales.proforma_invoice.*',
                    'sales.sales_order.*',
                    'sales.invoice.view',
                    'sales.invoice.create',
                    'sales.invoice.update',
                    'crm.lead.*',
                    'crm.deal.view',
                    'crm.deal.create',
                    'crm.deal.update',
                    'crm.activity.*',
                    'crm.activity_comment.*',
                    'master.contact.view',
                    'master.contact.create',
                    'master.contact.update',
                    'master.product.view',
                ],
                'deny' => [
                    '*.delete',
                    '*.approve',
                    '*.reject',
                    '*.void',
                ],
            ],

            'Receivable Officer' => [
                'allow' => [
                    'receivable.*',
                    'sales.invoice.view',
                    'sales.invoice.print',
                    'sales.invoice.email',
                    'report.receivable.*',
                    'master.contact.view',
                ],
                'deny' => [
                    '*.delete',
                    '*.approve',
                    '*.reject',
                    '*.void',
                ],
            ],

            'Sales Approver' => [
                'allow' => [
                    'sales.*.view',
                    'sales.*.approve',
                    'sales.*.reject',
                    'sales.*.void',
                    'sales.*.print',
                    'report.sales.*',
                ],
            ],

            'Purchase Manager' => [
                'allow' => [
                    'purchase.*',
                    'payable.*',
                    'report.purchase.*',
                    'report.payable.*',
                    'master.contact.*',
                    'master.product.view',
                ],
            ],

            'Purchase Executive' => [
                'allow' => [
                    'purchase.purchase_order.*',
                    'purchase.purchase_bill.view',
                    'purchase.purchase_bill.create',
                    'purchase.purchase_bill.update',
                    'purchase.debit_note.view',
                    'purchase.debit_note.create',
                    'purchase.debit_note.update',
                    'master.contact.view',
                    'master.contact.create',
                    'master.contact.update',
                    'master.product.view',
                ],
                'deny' => [
                    '*.delete',
                    '*.approve',
                    '*.reject',
                    '*.void',
                ],
            ],

            'Payable Officer' => [
                'allow' => [
                    'payable.*',
                    'purchase.purchase_bill.view',
                    'purchase.purchase_bill.print',
                    'report.payable.*',
                    'master.contact.view',
                ],
                'deny' => [
                    '*.delete',
                    '*.approve',
                    '*.reject',
                    '*.void',
                ],
            ],

            'Purchase Approver' => [
                'allow' => [
                    'purchase.*.view',
                    'purchase.*.approve',
                    'purchase.*.reject',
                    'purchase.*.void',
                    'purchase.*.print',
                    'payable.*.view',
                    'payable.*.approve',
                    'payable.*.reject',
                    'payable.*.void',
                    'report.purchase.*',
                ],
            ],

            'Inventory Manager' => [
                'allow' => [
                    'inventory.*',
                    'master.product.*',
                    'master.product_category.*',
                    'master.product_tax_category.*',
                    'master.product_unit.*',
                    'master.warehouse.*',
                    'report.inventory.*',
                ],
            ],

            'Warehouse Manager' => [
                'allow' => [
                    'inventory.*',
                    'master.product.view',
                    'master.warehouse.view',
                    'report.inventory.*',
                ],
                'deny' => [
                    'inventory.configuration.update',
                ],
            ],

            'Warehouse Operator' => [
                'allow' => [
                    'inventory.stock.view',
                    'inventory.stock_ledger.view',
                    'inventory.inventory_adjustment.view',
                    'inventory.inventory_adjustment.create',
                    'inventory.inventory_adjustment.update',
                    'inventory.warehouse_transfer.view',
                    'inventory.warehouse_transfer.create',
                    'inventory.warehouse_transfer.update',
                    'master.product.view',
                    'master.warehouse.view',
                ],
            ],

            'Inventory Approver' => [
                'allow' => [
                    'inventory.*.view',
                    'inventory.*.approve',
                    'inventory.*.reject',
                    'inventory.*.void',
                    'inventory.*.print',
                    'report.inventory.*',
                ],
            ],

            'POS Manager' => [
                'allow' => [
                    'pos.*',
                    'report.sales.*',
                    'report.inventory.stock_summary.*',
                    'master.product.view',
                    'master.contact.view',
                ],
            ],

            'Cashier' => [
                'allow' => [
                    'pos.sale.view',
                    'pos.sale.create',
                    'pos.sale.print',
                    'pos.sale.email',
                    'pos.payment.view',
                    'pos.payment.create',
                    'pos.shift.view',
                    'pos.shift.open',
                    'pos.shift.close',
                    'pos.cash_movement.view',
                    'pos.cash_movement.create',
                    'master.product.view',
                    'master.contact.view',
                ],
            ],

            'POS Supervisor' => [
                'allow' => [
                    'pos.*.view',
                    'pos.return.*',
                    'pos.sale.void',
                    'pos.cash_movement.*',
                    'pos.shift.*',
                    'report.sales.*',
                ],
                'deny' => [
                    'pos.terminal.delete',
                ],
            ],

            'CRM Manager' => [
                'allow' => [
                    'crm.*',
                    'master.contact.view',
                    'master.contact.create',
                    'master.contact.update',
                    'report.sales.sales_by_customer.*',
                ],
            ],

            'CRM Executive' => [
                'allow' => [
                    'crm.lead.view',
                    'crm.lead.create',
                    'crm.lead.update',
                    'crm.lead.assign',
                    'crm.lead.convert',
                    'crm.deal.view',
                    'crm.deal.create',
                    'crm.deal.update',
                    'crm.deal.change_stage',
                    'crm.activity.*',
                    'crm.activity_comment.*',
                    'master.contact.view',
                ],
            ],

            'HR Manager' => [
                'allow' => [
                    'hrm.*',
                    'payroll.*',
                    'payslip.*',
                    'salary-structure.*',
                    'reimbursement.*',
                    'report.hrm.*',
                    'system.user.view',
                    'system.user.create',
                    'system.user.update',
                ],
            ],

            'HR Officer' => [
                'allow' => [
                    'hrm.employee.*',
                    'hrm.employee_document.*',
                    'hrm.attendance.*',
                    'hrm.leave_application.*',
                    'hrm.department.view',
                    'hrm.designation.view',
                    'hrm.employment_status.view',
                    'hrm.leave_policy.view',
                    'hrm.shift.view',
                    'hrm.weekly_holiday.view',
                    'hrm.public_holiday.view',
                    'hrm.onboarding_checklist.*',
                    'report.hrm.attendance.*',
                    'report.hrm.leave.*',
                    'report.hrm.employee.*',
                ],
                'deny' => [
                    'hrm.payslip.*',
                    'hrm.salary_history.*',
                    '*.delete',
                ],
            ],

            'Payroll Officer' => [
                'allow' => [
                    'hrm.employee.view',
                    'hrm.payslip.*',
                    'hrm.payroll.*',
                    'hrm.salary_structure.*',
                    'hrm.reimbursement.view',
                    'hrm.reimbursement.create',
                    'payroll.view',
                    'payroll.create',
                    'payroll.generate',
                    'payroll.review',
                    'payroll.void',
                    'payroll.export',
                    'payslip.*',
                    'salary-structure.*',
                    'reimbursement.view',
                    'reimbursement.create',
                    'hrm.salary_history.*',
                    'hrm.attendance.view',
                    'hrm.leave_application.view',
                    'report.hrm.payroll.*',
                ],
                'deny' => [
                    'hrm.payroll.approve',
                    'hrm.payroll.pay',
                    'hrm.payroll.lock',
                ],
            ],

            'Department Manager' => [
                'allow' => [
                    'hrm.employee.view',
                    'hrm.attendance.view',
                    'hrm.leave_application.view',
                    'hrm.leave_application.approve',
                    'hrm.leave_application.reject',
                    'project.task.*',
                    'self.*',
                ],
                'deny' => [
                    '*.delete',
                ],
            ],

            'Employee' => [
                'allow' => [
                    'self.*',
                    'hrm.payslip.view-own',
                    'hrm.payslip.download',
                    'hrm.reimbursement.create',
                    'payslip.view-own',
                    'payslip.download',
                    'reimbursement.create',
                ],
            ],

            'Project Manager' => [
                'allow' => [
                    'project.*',
                    'report.hrm.employee.view',
                ],
            ],

            'Team Lead' => [
                'allow' => [
                    'project.project.view',
                    'project.team.view',
                    'project.milestone.view',
                    'project.task.*',
                    'project.task_status.view',
                    'project.priority.view',
                ],
                'deny' => [
                    'project.project.delete',
                    'project.team.delete',
                    'project.milestone.delete',
                ],
            ],

            'Team Member' => [
                'allow' => [
                    'project.project.view',
                    'project.team.view',
                    'project.milestone.view',
                    'project.task.view',
                    'project.task.update',
                    'project.task_status.view',
                    'project.priority.view',
                    'self.task.view',
                    'self.task.update',
                ],
            ],
        ];
    }

    private function matchPermissions(array $allPermissions, array $allowPatterns, array $denyPatterns = []): array
    {
        $allowed = [];

        foreach ($allPermissions as $permission) {
            foreach ($allowPatterns as $pattern) {
                if ($pattern === '*' || Str::is($pattern, $permission)) {
                    $allowed[] = $permission;
                    break;
                }
            }
        }

        $allowed = array_values(array_unique($allowed));

        if (! empty($denyPatterns)) {
            $allowed = array_values(array_filter($allowed, function ($permission) use ($denyPatterns) {
                foreach ($denyPatterns as $pattern) {
                    if (Str::is($pattern, $permission)) {
                        return false;
                    }
                }

                return true;
            }));
        }

        sort($allowed);

        return $allowed;
    }

    private function upsertPermission(string $name): string
    {
        $query = DB::table('permissions')->where('name', $name);

        if (Schema::hasColumn('permissions', 'guard_name')) {
            $query->where('guard_name', $this->guard);
        }

        $existing = $query->first();

        $payload = [
            'name' => $name,
        ];

        if (Schema::hasColumn('permissions', 'guard_name')) {
            $payload['guard_name'] = $this->guard;
        }

        if (Schema::hasColumn('permissions', 'description')) {
            $payload['description'] = Str::headline(str_replace('.', ' ', $name));
        }

        if (Schema::hasColumn('permissions', 'branch_id')) {
            $payload['branch_id'] = null;
        }

        if (Schema::hasColumn('permissions', 'active')) {
            $payload['active'] = true;
        }

        if (Schema::hasColumn('permissions', 'is_system_generated')) {
            $payload['is_system_generated'] = true;
        }

        if (Schema::hasColumn('permissions', 'user_add_id')) {
            $payload['user_add_id'] = null;
        }

        $payload = $this->withTimestamps('permissions', $payload);

        if ($existing) {
            DB::table('permissions')->where('id', $existing->id)->update($payload);

            return (string) $existing->id;
        }

        $id = (string) Str::uuid();

        DB::table('permissions')->insert(array_merge([
            'id' => $id,
        ], $payload));

        return $id;
    }

    private function upsertRole(string $name): string
    {
        $query = DB::table('roles')->where('name', $name);

        if (Schema::hasColumn('roles', 'guard_name')) {
            $query->where('guard_name', $this->guard);
        }

        $existing = $query->first();

        $payload = [
            'name' => $name,
        ];

        if (Schema::hasColumn('roles', 'guard_name')) {
            $payload['guard_name'] = $this->guard;
        }

        if (Schema::hasColumn('roles', 'description')) {
            $payload['description'] = $this->roleDescription($name);
        }

        if (Schema::hasColumn('roles', 'branch_id')) {
            $payload['branch_id'] = null;
        }

        if (Schema::hasColumn('roles', 'active')) {
            $payload['active'] = true;
        }

        if (Schema::hasColumn('roles', 'is_system_generated')) {
            $payload['is_system_generated'] = true;
        }

        if (Schema::hasColumn('roles', 'user_add_id')) {
            $payload['user_add_id'] = null;
        }

        $payload = $this->withTimestamps('roles', $payload);

        if ($existing) {
            DB::table('roles')->where('id', $existing->id)->update($payload);

            return (string) $existing->id;
        }

        $id = (string) Str::uuid();

        DB::table('roles')->insert(array_merge([
            'id' => $id,
        ], $payload));

        return $id;
    }

    private function syncRolePermissions(string $roleId, array $permissionIds): void
    {
        $permissionIds = array_values(array_unique($permissionIds));

        if (Schema::hasTable('role_permissions')) {
            DB::table('role_permissions')->where('role_id', $roleId)->delete();

            foreach ($permissionIds as $permissionId) {
                $payload = [
                    'id' => (string) Str::uuid(),
                    'role_id' => $roleId,
                    'permission_id' => $permissionId,
                ];

                $payload = $this->withTimestamps('role_permissions', $payload);

                DB::table('role_permissions')->insert($payload);
            }
        }

        if (Schema::hasTable('role_has_permissions')) {
            DB::table('role_has_permissions')->where('role_id', $roleId)->delete();

            foreach ($permissionIds as $permissionId) {
                DB::table('role_has_permissions')->insert([
                    'role_id' => $roleId,
                    'permission_id' => $permissionId,
                ]);
            }
        }
    }

    private function assignSuperAdminToFirstUser(?string $superAdminRoleId): void
    {
        if (! $superAdminRoleId) {
            return;
        }

        if (! Schema::hasTable('users')) {
            return;
        }

        if (! Schema::hasTable('model_has_roles')) {
            return;
        }

        $user = DB::table('users')->orderBy('id')->first();

        if (! $user) {
            return;
        }

        $modelType = 'App\\Models\\User';

        $exists = DB::table('model_has_roles')
            ->where('role_id', $superAdminRoleId)
            ->where('model_type', $modelType)
            ->where('model_id', $user->id)
            ->exists();

        if (! $exists) {
            DB::table('model_has_roles')->insert([
                'role_id' => $superAdminRoleId,
                'model_type' => $modelType,
                'model_id' => $user->id,
            ]);
        }
    }

    private function withTimestamps(string $table, array $payload): array
    {
        $now = now();

        if (Schema::hasColumn($table, 'created_at') && ! array_key_exists('created_at', $payload)) {
            $payload['created_at'] = $now;
        }

        if (Schema::hasColumn($table, 'updated_at')) {
            $payload['updated_at'] = $now;
        }

        return $payload;
    }

    private function roleDescription(string $role): string
    {
        return match ($role) {
            'Super Admin' => 'Full unrestricted system access.',
            'Company Owner' => 'Full business-level access except dangerous permission and audit deletion operations.',
            'Branch Admin' => 'Branch-level administrator access.',
            'System Manager' => 'Manages system configuration, users, roles, templates, and numbering.',
            'Auditor' => 'Read-only and export access for audit and review.',
            'Finance Controller' => 'Full finance, accounting, tax, payable, receivable, and report access.',
            'Accountant' => 'Accounting transaction creation and management without approval or void authority.',
            'Junior Accountant' => 'Draft-level accounting and payment data entry.',
            'Cashier / Treasurer' => 'Cash, bank, cheque, receipt, and payment operations.',
            'Tax Officer' => 'Tax setup and tax report access.',
            'Finance Approver' => 'Approval authority for finance transactions.',
            'Sales Manager' => 'Full sales, CRM, receivable, and sales report access.',
            'Sales Executive' => 'Sales and CRM data entry without approval authority.',
            'Receivable Officer' => 'Customer payment and receivable management.',
            'Sales Approver' => 'Sales document approval authority.',
            'Purchase Manager' => 'Full purchase, payable, and purchase report access.',
            'Purchase Executive' => 'Purchase document data entry without approval authority.',
            'Payable Officer' => 'Supplier payment and payable management.',
            'Purchase Approver' => 'Purchase document approval authority.',
            'Inventory Manager' => 'Full inventory, warehouse, stock, and inventory report access.',
            'Warehouse Manager' => 'Warehouse operation and stock movement management.',
            'Warehouse Operator' => 'Stock movement data entry without approval authority.',
            'Inventory Approver' => 'Inventory document approval authority.',
            'POS Manager' => 'Full POS terminal, shift, sale, return, and POS report access.',
            'Cashier' => 'POS sale, payment, and shift operation access.',
            'POS Supervisor' => 'POS supervision, returns, cash movement, and void authority.',
            'CRM Manager' => 'Full CRM lead, deal, pipeline, and activity access.',
            'CRM Executive' => 'CRM lead, deal, and activity management.',
            'HR Manager' => 'Full HRM and payroll access.',
            'HR Officer' => 'Employee, attendance, leave, and onboarding management.',
            'Payroll Officer' => 'Payroll, payslip, and salary management.',
            'Department Manager' => 'Team-level leave, attendance, project, and task management.',
            'Employee' => 'Employee self-service access.',
            'Project Manager' => 'Full project, milestone, team, and task management.',
            'Team Lead' => 'Team task and milestone management.',
            'Team Member' => 'Own task and project participation access.',
            default => Str::headline($role),
        };
    }
}
