<?php

namespace App\Services\Search\Definitions;

class RecordSearchDefinitions
{
    public static function items(): array
    {
        return [
            self::record('master', 'Master / Setup', 'branch', \App\Models\Branch::class, ['code', 'name', 'email', 'phone', 'address'], 'name', '/settings?tab=branches', ['code', 'address'], null, false, false),
            self::record('master', 'Master / Setup', 'currency', \App\Models\Currency::class, ['code', 'name', 'symbol'], 'name', '/settings?tab=currencies', ['code', 'symbol'], null, false, false),
            self::record('master', 'Master / Setup', 'fiscal_year', \App\Models\FiscalYear::class, ['name', 'code', 'status'], 'name', '/settings?tab=fiscal-years', ['code', 'status'], 'status', false, false, 'start_date'),
            self::record('settings', 'Settings', 'document_numbering', \App\Models\DocumentNumbering::class, ['document_type', 'prefix'], 'document_type', '/settings?tab=document-numberings', ['prefix', 'next_number'], 'active', false, false),
            self::record('settings', 'Settings', 'approval_workflow', \App\Models\ApprovalWorkflow::class, ['module', 'document_type', 'approval_mode'], 'document_type', '/settings?tab=approval-workflows', ['module', 'approval_mode'], 'active', false, false),
            self::record('settings', 'Settings', 'email_template', \App\Models\EmailTemplate::class, ['module', 'name', 'subject'], 'name', '/settings?tab=email-templates', ['module', 'subject'], 'active', false, false),
            self::record('settings', 'Settings', 'printing_template', \App\Models\PrintingTemplate::class, ['name', 'document_type'], 'name', '/settings?tab=printing-templates', ['document_type'], 'active', false, false),
            self::record('settings', 'Settings', 'custom_template', \App\Models\CustomTemplate::class, ['name', 'module', 'subject'], 'name', '/settings?tab=custom-templates', ['module', 'subject'], 'active', false, false),
            self::record('settings', 'Settings', 'alert_type', \App\Models\AlertType::class, ['name', 'code', 'description'], 'name', '/settings?tab=alert-types', ['code'], 'active', false, false),
            self::record('settings', 'Settings', 'reporting_tag', \App\Models\ReportingTag::class, ['name', 'code', 'description'], 'name', '/settings?tab=reporting-tags', ['code'], 'active', false, false),

            self::record('crm', 'CRM', 'contact', \App\Models\Contact::class, ['name', 'code', 'phone', 'email', 'pan', 'tax_registration_no'], 'name', '/crm/contacts/{id}', ['code', 'phone', 'email', 'pan'], 'contact_type', false, false),
            self::record('crm', 'CRM', 'contact_group', \App\Models\ContactGroup::class, ['name', 'description'], 'name', '/crm/contact-groups/{id}', ['description'], 'active', false, false),
            self::record('crm', 'CRM', 'lead', \App\Models\Lead::class, ['lead_no', 'name', 'company_name', 'email', 'phone', 'mobile', 'status'], 'name', '/crm/leads/{id}', ['lead_no', 'company_name', 'phone'], 'status', false, false, 'next_follow_up_date'),
            self::record('crm', 'CRM', 'deal', \App\Models\Deal::class, ['deal_no', 'title', 'source', 'status', 'contact.name'], 'title', '/crm/deals/{id}', ['deal_no', 'contact.name', 'source'], 'status', false, false, 'expected_close_date', ['contact']),
            self::record('crm', 'CRM', 'crm_activity', \App\Models\CrmActivity::class, ['subject', 'activity_type', 'status', 'contact.name', 'deal.title'], 'subject', '/crm/activities/{id}', ['activity_type', 'contact.name', 'deal.title'], 'status', false, false, 'due_at', ['contact', 'deal']),
            self::record('crm', 'CRM', 'crm_account', \App\Models\CrmAccount::class, ['account_no', 'name', 'status', 'contact.name'], 'name', '/crm/accounts/{id}', ['account_no', 'contact.name'], 'status', true, false, null, ['branch', 'contact']),
            self::record('crm', 'CRM', 'crm_campaign', \App\Models\CrmCampaign::class, ['name', 'code', 'status'], 'name', '/crm/campaigns', ['code'], 'status', true, false, 'start_date', ['branch']),
            self::record('crm', 'CRM', 'crm_communication', \App\Models\CrmCommunication::class, ['subject', 'channel', 'direction', 'status'], 'subject', '/crm/communications', ['channel', 'direction'], 'status', true, false, 'sent_at', ['branch']),
            self::record('crm', 'CRM', 'crm_sequence', \App\Models\CrmSequence::class, ['name', 'target_type'], 'name', '/crm/sequences', ['target_type'], 'active', true, false, null, ['branch']),

            self::document('sales', 'Sales / Payment In', 'quotation', \App\Models\Quotation::class, ['quotation_no', 'notes', 'status', 'contact.name'], 'quotation_no', '/payment-in/quotations/{id}', 'quotation_date'),
            self::document('sales', 'Sales / Payment In', 'sales_order', \App\Models\SalesOrder::class, ['sales_order_no', 'reference', 'status', 'contact.name'], 'sales_order_no', '/payment-in/sales-orders/{id}', 'sales_order_date'),
            self::document('sales', 'Sales / Payment In', 'proforma_invoice', \App\Models\ProformaInvoice::class, ['proforma_no', 'reference', 'status', 'contact.name'], 'proforma_no', '/payment-in/proforma-invoices/{id}', 'proforma_date'),
            self::document('sales', 'Sales / Payment In', 'invoice', \App\Models\Invoice::class, ['invoice_no', 'reference', 'status', 'contact.name'], 'invoice_no', '/payment-in/invoices/{id}', 'invoice_date'),
            self::document('sales', 'Sales / Payment In', 'customer_payment', \App\Models\CustomerPayment::class, ['payment_no', 'reference', 'payment_method', 'status', 'contact.name'], 'payment_no', '/payment-in/payments/{id}', 'payment_date', 'amount'),
            self::document('sales', 'Sales / Payment In', 'credit_note', \App\Models\SalesReturn::class, ['sales_return_no', 'reference', 'status', 'contact.name'], 'sales_return_no', '/payment-in/credit-notes/{id}', 'sales_return_date'),

            self::document('purchase', 'Purchase / Payment Out', 'purchase_order', \App\Models\PurchaseOrder::class, ['purchase_order_no', 'status', 'contact.name', 'notes'], 'purchase_order_no', '/payment-out/purchase-orders/{id}', 'purchase_order_date'),
            self::document('purchase', 'Purchase / Payment Out', 'purchase_bill', \App\Models\PurchaseBill::class, ['bill_no', 'reference', 'status', 'contact.name'], 'bill_no', '/payment-out/purchase-bills/{id}', 'bill_date'),
            self::document('purchase', 'Purchase / Payment Out', 'expense', \App\Models\Expense::class, ['expense_no', 'reference', 'status', 'contact.name'], 'expense_no', '/payment-out/expenses/{id}', 'expense_date'),
            self::document('purchase', 'Purchase / Payment Out', 'debit_note', \App\Models\DebitNote::class, ['debit_note_no', 'reference', 'status', 'contact.name'], 'debit_note_no', '/payment-out/debit-notes/{id}', 'debit_note_date'),
            self::document('purchase', 'Purchase / Payment Out', 'supplier_payment', \App\Models\SupplierPayment::class, ['payment_no', 'reference', 'method', 'status', 'contact.name'], 'payment_no', '/payment-out/supplier-payments/{id}', 'payment_date', 'amount'),

            self::record('accounting', 'Accounting', 'chart_of_account', \App\Models\ChartOfAccount::class, ['code', 'name', 'account_type'], 'name', '/accounting/chart-of-accounts/{id}', ['code', 'account_type'], 'active', true, false, null, ['branch']),
            self::record('accounting', 'Accounting', 'account', \App\Models\Account::class, ['code', 'name', 'account_type'], 'name', '/accounting/accounts/{id}', ['code', 'account_type'], 'active', false, false),
            self::record('accounting', 'Accounting', 'bank_account', \App\Models\BankAccount::class, ['display_name', 'code', 'bank_name', 'account_name', 'account_number'], 'display_name', '/accounting/bank-accounts/{id}', ['code', 'bank_name', 'account_number'], 'active', true, false, null, ['branch']),
            self::document('accounting', 'Accounting', 'journal_voucher', \App\Models\JournalVoucher::class, ['voucher_no', 'reference', 'narration', 'status'], 'voucher_no', '/accounting/journal-vouchers/{id}', 'voucher_date'),
            self::document('accounting', 'Accounting', 'cash_transfer', \App\Models\CashTransfer::class, ['transfer_no', 'reference', 'notes', 'status'], 'transfer_no', '/accounting/cash-transfers/{id}', 'transfer_date', 'total_amount'),
            self::document('accounting', 'Accounting', 'cheque_register', \App\Models\ChequeRegister::class, ['cheque_no', 'payee_name', 'status', 'notes'], 'cheque_no', '/accounting/cheque-registers/{id}', 'cheque_date', 'amount'),
            self::record('accounting', 'Accounting', 'loan_account', \App\Models\LoanAccount::class, ['name', 'bank_name', 'loan_number', 'status'], 'name', '/accounting/loan-accounts/{id}', ['bank_name', 'loan_number'], 'status', false, false, 'balance_as_of'),
            self::record('accounting', 'Accounting', 'loan_charge', \App\Models\LoanCharge::class, ['charge_type', 'reference', 'notes'], 'charge_type', '/accounting/loan-charges', ['reference'], null, false, false, 'charge_date'),
            self::record('accounting', 'Accounting', 'loan_top_up', \App\Models\LoanTopUp::class, ['reference', 'notes'], 'reference', '/accounting/loan-top-ups', ['notes'], null, false, false, 'top_up_date'),

            self::record('inventory', 'Inventory / Warehouse', 'product', \App\Models\Product::class, ['name', 'code', 'sku', 'barcode', 'description'], 'name', '/inventory/products/{id}', ['sku', 'barcode', 'code'], 'active', false, false, null, ['productCategory', 'productUnit']),
            self::record('inventory', 'Inventory / Warehouse', 'product_category', \App\Models\ProductCategory::class, ['name', 'description'], 'name', '/inventory/product-categories', ['description'], 'active', false, false),
            self::record('inventory', 'Inventory / Warehouse', 'product_unit', \App\Models\ProductUnit::class, ['name', 'code', 'symbol'], 'name', '/inventory/product-units', ['code', 'symbol'], 'active', false, false),
            self::record('inventory', 'Inventory / Warehouse', 'product_variant_item', \App\Models\ProductVariantItem::class, ['name', 'sku', 'barcode'], 'name', '/inventory/variant-products/{id}', ['sku', 'barcode'], 'active', false, false),
            self::record('inventory', 'Inventory / Warehouse', 'variant', \App\Models\Variant::class, ['name', 'description'], 'name', '/inventory/variant-attributes', ['description'], 'active', false, false),
            self::record('warehouse', 'Inventory / Warehouse', 'warehouse', \App\Models\Warehouse::class, ['code', 'name', 'address'], 'name', '/warehouse/{id}', ['code', 'address'], 'active', true, false, null, ['branch']),
            self::record('warehouse', 'Inventory / Warehouse', 'warehouse_item', \App\Models\WarehouseItem::class, ['product.name', 'product.sku', 'product.barcode', 'warehouse.name'], 'product.name', '/inventory/warehouse-items', ['warehouse.name'], null, true, false, null, ['branch', 'product', 'warehouse']),
            self::document('inventory', 'Inventory / Warehouse', 'warehouse_transfer', \App\Models\WarehouseTransfer::class, ['transfer_no', 'notes', 'status'], 'transfer_no', '/inventory/warehouse-transfers/{id}', 'transfer_date'),
            self::document('inventory', 'Inventory / Warehouse', 'inventory_adjustment', \App\Models\InventoryAdjustment::class, ['adjustment_no', 'reason', 'notes', 'status'], 'adjustment_no', '/inventory/adjustments/{id}', 'adjustment_date'),
            self::record('manufacturing', 'Manufacturing', 'bill_of_material', \App\Models\BillOfMaterial::class, ['bom_no', 'name', 'product.name'], 'name', '/inventory/bill-of-materials/{id}', ['bom_no', 'product.name'], 'active', true, false, null, ['branch', 'product']),
            self::record('manufacturing', 'Manufacturing', 'production_cost_term', \App\Models\ProductionCostTerm::class, ['name', 'description'], 'name', '/inventory/production-cost-terms', ['description'], 'active', true, false, null, ['branch']),
            self::document('manufacturing', 'Manufacturing', 'production_order', \App\Models\ProductionOrder::class, ['production_order_no', 'status', 'product.name'], 'production_order_no', '/inventory/production-orders/{id}', 'date'),
            self::document('manufacturing', 'Manufacturing', 'production_journal', \App\Models\ProductionJournal::class, ['production_journal_no', 'status', 'productionOrder.production_order_no'], 'production_journal_no', '/inventory/production-journals/{id}', 'date', 'total_cost', ['branch', 'productionOrder']),

            self::document('pos', 'POS', 'pos_sale', \App\Models\PosSale::class, ['sale_no', 'customer_name', 'customer_phone', 'status', 'payment_status'], 'sale_no', '/pos/sales/{id}', 'sale_date', 'grand_total'),
            self::document('pos', 'POS', 'pos_return', \App\Models\PosReturn::class, ['return_no', 'reason', 'status', 'posSale.sale_no'], 'return_no', '/pos/returns', 'return_date', 'refund_amount', ['branch', 'posSale']),
            self::record('pos', 'POS', 'pos_shift', \App\Models\PosShift::class, ['shift_no', 'status', 'cashier.name', 'posTerminal.name'], 'shift_no', '/pos/shifts', ['cashier.name', 'posTerminal.name'], 'status', true, true, 'opened_at', ['branch', 'cashier', 'posTerminal']),
            self::record('pos', 'POS', 'pos_terminal', \App\Models\PosTerminal::class, ['code', 'name', 'location'], 'name', '/pos/terminals', ['code', 'location'], 'active', true, false, null, ['branch']),
            self::record('pos', 'POS', 'pos_cash_movement', \App\Models\PosCashMovement::class, ['movement_no', 'movement_type', 'reason', 'notes'], 'movement_no', '/pos/cash-movements', ['movement_type', 'reason'], 'status', true, false, 'movement_date', ['branch']),
            self::record('pos', 'POS', 'pos_payment', \App\Models\PosPayment::class, ['payment_method', 'reference', 'transaction_no'], 'reference', '/pos/sales', ['payment_method', 'transaction_no'], null, false, false, 'payment_date'),

            self::record('hrm', 'HRM', 'employee', \App\Models\User::class, ['name', 'email', 'username', 'employee_id', 'phone'], 'display_name', '/hrm/users/{id}', ['employee_id', 'email', 'department.name'], 'active', true, false, null, ['branch', 'department']),
            self::record('hrm', 'HRM', 'employee_profile', \App\Models\EmployeeProfile::class, ['employee_code', 'user.name', 'user.email'], 'user.name', '/hrm/users/{user_id}', ['employee_code', 'user.email'], 'active', true, false, null, ['branch', 'user']),
            self::record('hrm', 'HRM', 'attendance', \App\Models\Attendance::class, ['user.name', 'in_time_status', 'out_time_status', 'comment'], 'user.name', '/hrm/attendance', ['in_time_status', 'out_time_status'], 'in_time_status', true, false, 'in_time', ['branch', 'user']),
            self::record('hrm', 'HRM', 'leave_application', \App\Models\LeaveApplication::class, ['user.name', 'leave_type', 'reason', 'status'], 'user.name', '/hrm/leave-applications', ['leave_type', 'reason'], 'status', true, false, 'leave_from', ['branch', 'user']),
            self::record('hrm', 'HRM', 'leave_request', \App\Models\LeaveRequest::class, ['user.name', 'reason', 'status'], 'user.name', '/hrm/leave-applications', ['reason'], 'status', true, false, 'leave_from', ['branch', 'user']),
            self::record('hrm', 'HRM', 'leave_policy', \App\Models\LeavePolicy::class, ['name', 'description'], 'name', '/hrm/leave-policies', ['description'], 'active', true, false, null, ['branch']),
            self::record('hrm', 'HRM', 'leave_type', \App\Models\LeaveType::class, ['name', 'code'], 'name', '/hrm/leave-types', ['code'], 'active', true, false, null, ['branch']),
            self::record('hrm', 'HRM', 'department', \App\Models\Department::class, ['name', 'code'], 'name', '/hrm/departments', ['code'], 'active', true, false, null, ['branch']),
            self::record('hrm', 'HRM', 'shift', \App\Models\Shift::class, ['name', 'code'], 'name', '/hrm/shifts', ['code'], 'active', true, false, null, ['branch']),
            self::record('hrm', 'HRM', 'role', \App\Models\Role::class, ['name', 'guard_name'], 'name', '/hrm/roles', ['guard_name'], null, false, false),
            self::record('hrm', 'HRM', 'permission', \App\Models\Permission::class, ['name', 'guard_name'], 'name', '/hrm/permissions', ['guard_name'], null, false, false),

            self::record('payroll', 'Payroll', 'payslip', \App\Models\Payslip::class, ['user.name', 'salary_month', 'salary_year', 'payment_status', 'payslip_number'], 'payslip_number', '/hrm/payslips', ['user.name', 'salary_month', 'salary_year'], 'payment_status', true, true, null, ['branch', 'user']),
            self::record('payroll', 'Payroll', 'payroll_run', \App\Models\PayrollRun::class, ['payroll_number', 'status', 'payrollPeriod.name'], 'payroll_number', '/hrm/payroll', ['status'], 'status', true, true, 'period_start', ['branch']),
            self::record('payroll', 'Payroll', 'payroll_period', \App\Models\PayrollPeriod::class, ['name', 'month', 'year'], 'name', '/hrm/payroll', ['month', 'year'], 'active', true, false, null, ['branch']),
            self::record('payroll', 'Payroll', 'payroll_payment', \App\Models\PayrollPayment::class, ['payment_no', 'reference', 'employee.name'], 'payment_no', '/hrm/payroll', ['reference'], 'status', false, true, 'payment_date'),
            self::record('payroll', 'Payroll', 'salary_component', \App\Models\SalaryComponent::class, ['name', 'code', 'type'], 'name', '/hrm/payroll', ['code', 'type'], 'active', false, false),
            self::record('payroll', 'Payroll', 'salary_structure', \App\Models\SalaryStructure::class, ['name', 'employee.name'], 'name', '/hrm/payroll', ['employee.name'], 'active', true, false, null, ['branch']),
            self::record('payroll', 'Payroll', 'employee_addition', \App\Models\EmployeeAddition::class, ['name', 'employee.name', 'description'], 'name', '/hrm/payroll', ['employee.name'], 'active', true, false, null, ['branch']),
            self::record('payroll', 'Payroll', 'employee_deduction', \App\Models\EmployeeDeduction::class, ['name', 'employee.name', 'description'], 'name', '/hrm/payroll', ['employee.name'], 'active', true, false, null, ['branch']),
            self::record('payroll', 'Payroll', 'employee_reimbursement', \App\Models\EmployeeReimbursement::class, ['claim_no', 'employee.name', 'status'], 'claim_no', '/hrm/payroll', ['employee.name'], 'status', true, false, 'claim_date', ['branch']),
            self::record('payroll', 'Payroll', 'tax_slab', \App\Models\TaxSlab::class, ['name', 'code'], 'name', '/hrm/payroll', ['code'], 'active', false, false),

            self::record('project', 'Projects', 'project', \App\Models\Project::class, ['name', 'status', 'description'], 'name', '/hrm/projects/{id}', ['description'], 'status', false, false, 'start_date'),
            self::record('project', 'Projects', 'milestone', \App\Models\Milestone::class, ['name', 'status', 'project.name'], 'name', '/hrm/milestones', ['project.name'], 'status', false, false, 'start_date', ['project']),
            self::record('project', 'Projects', 'task', \App\Models\Task::class, ['name', 'description', 'project.name'], 'name', '/hrm/tasks', ['project.name', 'taskStatus.name'], 'taskStatus.name', false, false, 'start_date', ['project', 'taskStatus']),
            self::record('project', 'Projects', 'assigned_task', \App\Models\AssignedTask::class, ['task.name', 'user.name'], 'task.name', '/hrm/assigned-tasks', ['user.name'], null, false, false, null, ['task', 'user']),
            self::record('project', 'Projects', 'project_team', \App\Models\ProjectTeam::class, ['name', 'project.name'], 'name', '/hrm/project-teams', ['project.name'], 'active', false, false, null, ['project']),
            self::record('project', 'Projects', 'priority', \App\Models\Priority::class, ['name', 'color'], 'name', '/hrm/priorities', ['color'], 'active', true, false, null, ['branch']),
            self::record('project', 'Projects', 'task_status', \App\Models\TaskStatus::class, ['name', 'color'], 'name', '/hrm/task-statuses', ['color'], 'active', false, false),

            self::record('tax', 'Tax', 'tax_class', \App\Models\TaxClass::class, ['name', 'code', 'description'], 'name', '/tax/tax-classes', ['code'], 'active', false, false),
            self::record('tax', 'Tax', 'tax_rate', \App\Models\TaxRate::class, ['name', 'code', 'rate_percent'], 'name', '/tax/tax-rates', ['code', 'rate_percent'], 'active', false, false),
            self::record('tax', 'Tax', 'tax_rule', \App\Models\TaxRule::class, ['name', 'code', 'description'], 'name', '/tax/tax-rules', ['code'], 'active', false, false),
            self::record('tax', 'Tax', 'tax_exemption', \App\Models\TaxExemption::class, ['name', 'code', 'reason'], 'name', '/tax/tax-exemptions', ['code'], 'active', false, false),
            self::record('tax', 'Tax', 'tax_registration', \App\Models\TaxRegistration::class, ['registration_no', 'legal_name'], 'registration_no', '/tax/tax-registrations', ['legal_name'], 'active', false, false),
            self::record('tax', 'Tax', 'tax_jurisdiction', \App\Models\TaxJurisdiction::class, ['name', 'code', 'country'], 'name', '/tax/tax-jurisdictions', ['code', 'country'], 'active', false, false),
            self::record('tax', 'Tax', 'product_tax_category', \App\Models\ProductTaxCategory::class, ['name', 'code', 'description'], 'name', '/tax/product-tax-categories', ['code'], 'active', false, false),
        ];
    }

    private static function document(string $moduleKey, string $module, string $type, string $model, array $search, string $titleField, string $url, string $dateField, string $amountField = 'total', array $with = ['branch', 'contact']): array
    {
        return self::record($moduleKey, $module, $type, $model, $search, $titleField, $url, ['contact.name', $amountField, 'status'], 'status', true, true, $dateField, $with, $amountField);
    }

    private static function record(
        string $moduleKey,
        string $module,
        string $type,
        string $model,
        array $search,
        string $titleField,
        string $url,
        array $subtitleFields = [],
        ?string $statusField = null,
        bool $branchAware = true,
        bool $fiscalYearAware = false,
        ?string $businessDateColumn = null,
        array $with = [],
        ?string $amountField = null,
    ): array {
        return [
            'kind' => 'record',
            'module_key' => $moduleKey,
            'module' => $module,
            'type' => $type,
            'model' => $model,
            'permissions' => self::permissions($moduleKey, $type),
            'search' => $search,
            'priority' => [$search[0] ?? $titleField, $titleField],
            'with' => $with,
            'title_field' => $titleField,
            'subtitle_fields' => $subtitleFields,
            'status_field' => $statusField,
            'date_field' => $businessDateColumn,
            'business_date_column' => $businessDateColumn,
            'amount_field' => $amountField,
            'url' => $url,
            'branch_aware' => $branchAware,
            'fiscal_year_aware' => $fiscalYearAware,
        ];
    }

    private static function permissions(string $moduleKey, string $type): array
    {
        return [
            "{$moduleKey}.{$type}.view",
            str_replace('_', '.', "{$moduleKey}.{$type}.view"),
            "{$type}.view",
        ];
    }
}
