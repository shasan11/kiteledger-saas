<?php

namespace App\Services\Search\Definitions;

class PageSearchDefinitions
{
    public static function items(): array
    {
        return [
            ['module_key' => 'dashboard', 'module' => 'Dashboard', 'title' => 'Dashboard', 'url' => '/dashboard', 'keywords' => ['home', 'overview'], 'icon' => 'home'],
            ['module_key' => 'crm', 'module' => 'CRM', 'title' => 'CRM Dashboard', 'url' => '/crm/dashboard', 'keywords' => ['customers', 'pipeline'], 'icon' => 'contacts'],
            ['module_key' => 'crm', 'module' => 'CRM', 'title' => 'Contacts', 'url' => '/crm/contacts', 'keywords' => ['customers', 'suppliers'], 'icon' => 'contacts'],
            ['module_key' => 'crm', 'module' => 'CRM', 'title' => 'Contact Groups', 'url' => '/crm/contact-groups', 'keywords' => ['groups'], 'icon' => 'team'],
            ['module_key' => 'crm', 'module' => 'CRM', 'title' => 'Leads', 'url' => '/crm/leads', 'keywords' => ['prospects'], 'icon' => 'user-add'],
            ['module_key' => 'crm', 'module' => 'CRM', 'title' => 'Deals', 'url' => '/crm/deals', 'keywords' => ['opportunities'], 'icon' => 'project'],
            ['module_key' => 'crm', 'module' => 'CRM', 'title' => 'Activity Inbox', 'url' => '/crm/activity-inbox', 'keywords' => ['follow up', 'tasks'], 'icon' => 'inbox'],
            ['module_key' => 'crm', 'module' => 'CRM', 'title' => 'CRM Activities', 'url' => '/crm/activities', 'keywords' => ['calls', 'meetings'], 'icon' => 'calendar'],

            ['module_key' => 'sales', 'module' => 'Sales / Payment In', 'title' => 'Quotations', 'url' => '/payment-in/quotations', 'keywords' => ['quote', 'estimate'], 'icon' => 'file-text'],
            ['module_key' => 'sales', 'module' => 'Sales / Payment In', 'title' => 'Sales Orders', 'url' => '/payment-in/sales-orders', 'keywords' => ['sales order', 'so'], 'icon' => 'file-text'],
            ['module_key' => 'sales', 'module' => 'Sales / Payment In', 'title' => 'Proforma Invoices', 'url' => '/payment-in/proforma-invoices', 'keywords' => ['proforma', 'pi'], 'icon' => 'file-text'],
            ['module_key' => 'sales', 'module' => 'Sales / Payment In', 'title' => 'Invoices', 'url' => '/payment-in/invoices', 'keywords' => ['bill', 'sales invoice'], 'icon' => 'file-text'],
            ['module_key' => 'sales', 'module' => 'Sales / Payment In', 'title' => 'Customer Payments', 'url' => '/payment-in/payments', 'keywords' => ['payment in', 'receipt'], 'icon' => 'credit-card'],
            ['module_key' => 'sales', 'module' => 'Sales / Payment In', 'title' => 'Credit Notes', 'url' => '/payment-in/credit-notes', 'keywords' => ['sales return', 'return'], 'icon' => 'undo'],

            ['module_key' => 'purchase', 'module' => 'Purchase / Payment Out', 'title' => 'Purchase Orders', 'url' => '/payment-out/purchase-orders', 'keywords' => ['po'], 'icon' => 'file-text'],
            ['module_key' => 'purchase', 'module' => 'Purchase / Payment Out', 'title' => 'Purchase Bills', 'url' => '/payment-out/purchase-bills', 'keywords' => ['supplier bill'], 'icon' => 'book'],
            ['module_key' => 'purchase', 'module' => 'Purchase / Payment Out', 'title' => 'Expenses', 'url' => '/payment-out/expenses', 'keywords' => ['expense claim'], 'icon' => 'wallet'],
            ['module_key' => 'purchase', 'module' => 'Purchase / Payment Out', 'title' => 'Debit Notes', 'url' => '/payment-out/debit-notes', 'keywords' => ['purchase return'], 'icon' => 'undo'],
            ['module_key' => 'purchase', 'module' => 'Purchase / Payment Out', 'title' => 'Supplier Payments', 'url' => '/payment-out/supplier-payments', 'keywords' => ['payment out', 'pay supplier'], 'icon' => 'wallet'],

            ['module_key' => 'accounting', 'module' => 'Accounting', 'title' => 'Chart of Accounts', 'url' => '/accounting/chart-of-accounts', 'keywords' => ['coa', 'ledger'], 'icon' => 'calculator'],
            ['module_key' => 'accounting', 'module' => 'Accounting', 'title' => 'Bank Accounts', 'url' => '/accounting/bank-accounts', 'keywords' => ['bank'], 'icon' => 'bank'],
            ['module_key' => 'accounting', 'module' => 'Accounting', 'title' => 'Cash Transfers', 'url' => '/accounting/cash-transfers', 'keywords' => ['cash transfer'], 'icon' => 'swap'],
            ['module_key' => 'accounting', 'module' => 'Accounting', 'title' => 'Cheque Registers', 'url' => '/accounting/cheque-registers', 'keywords' => ['cheque', 'check'], 'icon' => 'check-square'],
            ['module_key' => 'accounting', 'module' => 'Accounting', 'title' => 'Journal Vouchers', 'url' => '/accounting/journal-vouchers', 'keywords' => ['journal', 'voucher', 'adjustment'], 'icon' => 'audit'],
            ['module_key' => 'accounting', 'module' => 'Accounting', 'title' => 'Loan Accounts', 'url' => '/accounting/loan-accounts', 'keywords' => ['loan'], 'icon' => 'bank'],

            ['module_key' => 'inventory', 'module' => 'Inventory / Warehouse', 'title' => 'Products', 'url' => '/inventory/products', 'keywords' => ['items', 'sku', 'barcode'], 'icon' => 'barcode'],
            ['module_key' => 'inventory', 'module' => 'Inventory / Warehouse', 'title' => 'Services', 'url' => '/inventory/services', 'keywords' => ['service item'], 'icon' => 'tool'],
            ['module_key' => 'inventory', 'module' => 'Inventory / Warehouse', 'title' => 'Product Categories', 'url' => '/inventory/product-categories', 'keywords' => ['categories'], 'icon' => 'tags'],
            ['module_key' => 'inventory', 'module' => 'Inventory / Warehouse', 'title' => 'Warehouse Stock', 'url' => '/inventory/warehouse-items', 'keywords' => ['stock', 'inventory'], 'icon' => 'inbox'],
            ['module_key' => 'warehouse', 'module' => 'Inventory / Warehouse', 'title' => 'Warehouses', 'url' => '/warehouse', 'keywords' => ['locations'], 'icon' => 'shop'],
            ['module_key' => 'inventory', 'module' => 'Inventory / Warehouse', 'title' => 'Warehouse Transfers', 'url' => '/inventory/warehouse-transfers', 'keywords' => ['stock transfer'], 'icon' => 'swap'],
            ['module_key' => 'inventory', 'module' => 'Inventory / Warehouse', 'title' => 'Inventory Adjustments', 'url' => '/inventory/adjustments', 'keywords' => ['stock adjustment'], 'icon' => 'audit'],
            ['module_key' => 'manufacturing', 'module' => 'Manufacturing', 'title' => 'Bill of Materials', 'url' => '/inventory/bill-of-materials', 'keywords' => ['bom'], 'icon' => 'branches'],
            ['module_key' => 'manufacturing', 'module' => 'Manufacturing', 'title' => 'Production Orders', 'url' => '/inventory/production-orders', 'keywords' => ['manufacturing'], 'icon' => 'build'],
            ['module_key' => 'manufacturing', 'module' => 'Manufacturing', 'title' => 'Production Journals', 'url' => '/inventory/production-journals', 'keywords' => ['production posting'], 'icon' => 'audit'],

            ['module_key' => 'pos', 'module' => 'POS', 'title' => 'POS Screen', 'url' => '/pos/screen', 'keywords' => ['sell', 'terminal', 'checkout'], 'icon' => 'shop'],
            ['module_key' => 'pos', 'module' => 'POS', 'title' => 'Terminal Selection', 'url' => '/pos', 'keywords' => ['pos terminals'], 'icon' => 'shop'],
            ['module_key' => 'pos', 'module' => 'POS', 'title' => 'POS Sales', 'url' => '/pos/sales', 'keywords' => ['receipts'], 'icon' => 'shopping-cart'],
            ['module_key' => 'pos', 'module' => 'POS', 'title' => 'POS Shifts', 'url' => '/pos/shifts', 'keywords' => ['cashier shift'], 'icon' => 'clock'],
            ['module_key' => 'pos', 'module' => 'POS', 'title' => 'POS Returns', 'url' => '/pos/returns', 'keywords' => ['refund'], 'icon' => 'undo'],
            ['module_key' => 'pos', 'module' => 'POS', 'title' => 'POS Cash Movements', 'url' => '/pos/cash-movements', 'keywords' => ['cash in', 'cash out'], 'icon' => 'wallet'],
            ['module_key' => 'pos', 'module' => 'POS', 'title' => 'POS Terminals', 'url' => '/pos/terminals', 'keywords' => ['register'], 'icon' => 'desktop'],

            ['module_key' => 'hrm', 'module' => 'HRM', 'title' => 'Users / Employees', 'url' => '/hrm/users', 'keywords' => ['employee', 'staff'], 'icon' => 'team'],
            ['module_key' => 'hrm', 'module' => 'HRM', 'title' => 'Attendance', 'url' => '/hrm/attendance', 'keywords' => ['time'], 'icon' => 'calendar'],
            ['module_key' => 'hrm', 'module' => 'HRM', 'title' => 'Leave Applications', 'url' => '/hrm/leave-applications', 'keywords' => ['leave request'], 'icon' => 'calendar'],
            ['module_key' => 'payroll', 'module' => 'Payroll', 'title' => 'Payroll', 'url' => '/hrm/payroll', 'keywords' => ['salary', 'payroll run'], 'icon' => 'wallet'],
            ['module_key' => 'payroll', 'module' => 'Payroll', 'title' => 'Payslips', 'url' => '/hrm/payslips', 'keywords' => ['salary slip'], 'icon' => 'file-text'],
            ['module_key' => 'project', 'module' => 'Projects', 'title' => 'Projects', 'url' => '/hrm/projects', 'keywords' => ['project'], 'icon' => 'project'],
            ['module_key' => 'project', 'module' => 'Projects', 'title' => 'Tasks', 'url' => '/hrm/tasks', 'keywords' => ['task'], 'icon' => 'check-square'],

            ['module_key' => 'tax', 'module' => 'Tax', 'title' => 'Tax Dashboard', 'url' => '/tax/dashboard', 'keywords' => ['vat'], 'icon' => 'percentage'],
            ['module_key' => 'tax', 'module' => 'Tax', 'title' => 'Tax Settings', 'url' => '/tax/settings', 'keywords' => ['vat settings'], 'icon' => 'setting'],
            ['module_key' => 'tax', 'module' => 'Tax', 'title' => 'Tax Rates', 'url' => '/tax/tax-rates', 'keywords' => ['vat rate'], 'icon' => 'percentage'],
            ['module_key' => 'tax', 'module' => 'Tax', 'title' => 'Tax Rules', 'url' => '/tax/tax-rules', 'keywords' => ['tax apply'], 'icon' => 'rules'],
        ];
    }
}
