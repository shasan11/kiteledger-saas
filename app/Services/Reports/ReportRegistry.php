<?php

namespace App\Services\Reports;

class ReportRegistry
{
    public const DATE_MODE_PERIOD = 'period';
    public const DATE_MODE_AS_OF = 'as_of';
    public const DATE_MODE_AGEING = 'ageing';
    public const DATE_MODE_NONE = 'none';

    public static function categories(): array
    {
        $f = self::filterPresets();

        return [
            'accounting' => [
                'label' => 'Accounting',
                'icon' => 'book',
                'description' => 'Ledger, trial balance, statements and cash flow',
                'permission' => 'reports.financial.view',
                'reports' => [
                    'transaction-list' => [
                        'title' => 'Transaction List',
                        'description' => 'List of all posted transactions in a period',
                        'aliases' => ['transactions', 'transaction list', 'all transactions'],
                        'keywords' => ['transaction', 'voucher'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['status']],
                    ],
                    'journal-report' => [
                        'title' => 'Journal Report',
                        'description' => 'Journal voucher listing with debit/credit lines',
                        'aliases' => ['journal', 'journal voucher report', 'jv report'],
                        'keywords' => ['journal', 'jv', 'voucher'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['status']],
                    ],
                    'general-ledger-summary' => [
                        'title' => 'General Ledger Summary',
                        'description' => 'Account-wise debit / credit summary for the period',
                        'aliases' => ['general ledger summary', 'gl summary', 'ledger summary'],
                        'keywords' => ['ledger', 'gl', 'summary'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch']],
                    ],
                    'detail-general-ledger' => [
                        'title' => 'Detail General Ledger',
                        'description' => 'Line-level ledger for a chart of account',
                        'aliases' => ['ledger', 'account ledger', 'general ledger detail', 'gl detail', 'detail ledger'],
                        'keywords' => ['ledger', 'gl', 'detail', 'account'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['chartOfAccount']],
                    ],
                    'gl-master' => [
                        'title' => 'GL Master',
                        'description' => 'Chart of accounts master list',
                        'aliases' => ['chart of accounts', 'coa', 'gl master'],
                        'keywords' => ['chart of accounts', 'coa', 'master'],
                        'default_date_mode' => self::DATE_MODE_NONE,
                        'filter_schema' => [$f['branch'], $f['includeInactive']],
                    ],
                    'trial-balance' => [
                        'title' => 'Trial Balance',
                        'description' => 'Trial balance as at a date',
                        'aliases' => ['tb', 'trial', 'debit credit report', 'trial balance'],
                        'keywords' => ['trial', 'balance', 'tb'],
                        'default_date_mode' => self::DATE_MODE_AS_OF,
                        'filter_schema' => [$f['asOfDate'], $f['branch'], $f['includeZeroBalance']],
                    ],
                    'income-statement' => [
                        'title' => 'Income Statement',
                        'description' => 'Profit and loss for the period',
                        'aliases' => ['profit and loss', 'p&l', 'pnl', 'profit loss', 'income report', 'income statement'],
                        'keywords' => ['income', 'profit', 'loss', 'p&l', 'pnl'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch']],
                    ],
                    'balance-sheet' => [
                        'title' => 'Balance Sheet',
                        'description' => 'Statement of financial position',
                        'aliases' => ['financial position', 'assets liabilities', 'bs', 'balance sheet'],
                        'keywords' => ['balance sheet', 'assets', 'liabilities', 'equity'],
                        'default_date_mode' => self::DATE_MODE_AS_OF,
                        'filter_schema' => [$f['asOfDate'], $f['branch'], $f['includeZeroBalance']],
                    ],
                    'cash-flow-summary' => [
                        'title' => 'Cash Flow Summary',
                        'description' => 'Cash inflow and outflow summary',
                        'aliases' => ['cash flow', 'cash movement', 'cash summary', 'cash flow statement'],
                        'keywords' => ['cash flow', 'cash'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch']],
                    ],
                ],
            ],
            'receivable' => [
                'label' => 'Receivable',
                'icon' => 'dollar',
                'description' => 'Customer balances, ageing and statements',
                'permission' => 'reports.financial.view',
                'reports' => [
                    'customer-receivable-summary' => [
                        'title' => 'Customer Receivable Summary',
                        'description' => 'Outstanding receivable per customer as at a date',
                        'aliases' => ['customer receivable', 'receivable summary', 'ar summary', 'customer balance'],
                        'keywords' => ['receivable', 'customer', 'ar'],
                        'default_date_mode' => self::DATE_MODE_AS_OF,
                        'filter_schema' => [$f['asOfDate'], $f['branch'], $f['customer'], $f['includeZeroBalance']],
                    ],
                    'customer-ageing-summary' => [
                        'title' => 'Customer Ageing Summary',
                        'description' => 'Customer receivable broken into ageing buckets',
                        'aliases' => ['customer aging', 'customer ageing', 'receivable ageing', 'ar ageing', 'overdue customers'],
                        'keywords' => ['ageing', 'aging', 'receivable', 'customer', 'overdue'],
                        'default_date_mode' => self::DATE_MODE_AGEING,
                        'filter_schema' => [$f['ageingDate'], $f['branch'], $f['customer'], $f['includeZeroBalance']],
                    ],
                    'invoice-age' => [
                        'title' => 'Invoice Age',
                        'description' => 'Invoice-level ageing report',
                        'aliases' => ['invoice age', 'invoice ageing', 'invoice aging'],
                        'keywords' => ['invoice', 'ageing', 'aging'],
                        'default_date_mode' => self::DATE_MODE_AGEING,
                        'filter_schema' => [$f['ageingDate'], $f['branch'], $f['customer'], $f['includeZeroBalance']],
                    ],
                    'customer-statement' => [
                        'title' => 'Customer Statement',
                        'description' => 'Customer-level statement of account',
                        'aliases' => ['customer statement', 'statement of account'],
                        'keywords' => ['statement', 'customer'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['customer']],
                    ],
                ],
            ],
            'payable' => [
                'label' => 'Payable',
                'icon' => 'credit',
                'description' => 'Supplier balances, bills ageing and statements',
                'permission' => 'reports.financial.view',
                'reports' => [
                    'supplier-payable-summary' => [
                        'title' => 'Supplier Payable Summary',
                        'description' => 'Outstanding payable per supplier as at a date',
                        'aliases' => ['supplier payable', 'payable summary', 'ap summary', 'supplier balance'],
                        'keywords' => ['payable', 'supplier', 'ap'],
                        'default_date_mode' => self::DATE_MODE_AS_OF,
                        'filter_schema' => [$f['asOfDate'], $f['branch'], $f['supplier'], $f['includeZeroBalance']],
                    ],
                    'supplier-ageing-summary' => [
                        'title' => 'Supplier Ageing Summary',
                        'description' => 'Supplier payable broken into ageing buckets',
                        'aliases' => ['supplier aging', 'supplier ageing', 'payable ageing', 'ap ageing', 'overdue suppliers'],
                        'keywords' => ['ageing', 'aging', 'payable', 'supplier', 'overdue'],
                        'default_date_mode' => self::DATE_MODE_AGEING,
                        'filter_schema' => [$f['ageingDate'], $f['branch'], $f['supplier'], $f['includeZeroBalance']],
                    ],
                    'purchase-bill-age' => [
                        'title' => 'Purchase Bill Age',
                        'description' => 'Bill-level ageing report',
                        'aliases' => ['purchase bill age', 'bill ageing', 'bill aging'],
                        'keywords' => ['bill', 'ageing', 'aging'],
                        'default_date_mode' => self::DATE_MODE_AGEING,
                        'filter_schema' => [$f['ageingDate'], $f['branch'], $f['supplier'], $f['includeZeroBalance']],
                    ],
                    'supplier-statement' => [
                        'title' => 'Supplier Statement',
                        'description' => 'Supplier-level statement of account',
                        'aliases' => ['supplier statement'],
                        'keywords' => ['statement', 'supplier'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['supplier']],
                    ],
                ],
            ],
            'sales' => [
                'label' => 'Sales',
                'icon' => 'shopping-cart',
                'description' => 'Sales summaries, customers, items and masters',
                'permission' => 'reports.sales.view',
                'reports' => [
                    'sales-by-customer' => [
                        'title' => 'Sales By Customer',
                        'description' => 'Total sales grouped by customer',
                        'aliases' => ['sales by customer', 'customer sales'],
                        'keywords' => ['sales', 'customer'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['customer'], $f['status']],
                    ],
                    'sales-by-item' => [
                        'title' => 'Sales By Item',
                        'description' => 'Total sales grouped by item',
                        'aliases' => ['sales by item', 'item sales', 'sales by product'],
                        'keywords' => ['sales', 'item', 'product'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['product'], $f['status']],
                    ],
                    'sales-by-customer-monthly' => [
                        'title' => 'Sales By Customer Monthly',
                        'description' => 'Customer sales pivoted by month',
                        'aliases' => ['sales by customer monthly', 'monthly customer sales'],
                        'keywords' => ['sales', 'customer', 'monthly'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['customer']],
                    ],
                    'sales-by-item-monthly' => [
                        'title' => 'Sales By Item Monthly',
                        'description' => 'Item sales pivoted by month',
                        'aliases' => ['sales by item monthly', 'monthly item sales'],
                        'keywords' => ['sales', 'item', 'monthly'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['product']],
                    ],
                    'sales-master' => [
                        'title' => 'Sales Master',
                        'description' => 'Detail sales invoice register',
                        'aliases' => ['sales master', 'sales register detail'],
                        'keywords' => ['sales', 'master', 'invoice'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['customer'], $f['status']],
                    ],
                    'sales-summary' => [
                        'title' => 'Sales Summary',
                        'description' => 'Sales summary grouped by selected dimension',
                        'aliases' => ['sales summary', 'sales report', 'sales overview', 'sales this month'],
                        'keywords' => ['sales', 'summary', 'overview'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['groupBy']],
                    ],
                ],
            ],
            'purchase' => [
                'label' => 'Purchase',
                'icon' => 'shopping',
                'description' => 'Purchase analysis by supplier, item and period',
                'permission' => 'reports.purchase.view',
                'reports' => [
                    'purchase-by-supplier' => [
                        'title' => 'Purchase By Supplier',
                        'description' => 'Total purchases grouped by supplier',
                        'aliases' => ['purchase by supplier', 'supplier purchase'],
                        'keywords' => ['purchase', 'supplier'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['supplier'], $f['status']],
                    ],
                    'purchase-by-item' => [
                        'title' => 'Purchase By Item',
                        'description' => 'Total purchases grouped by item',
                        'aliases' => ['purchase by item', 'item purchase'],
                        'keywords' => ['purchase', 'item', 'product'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['product'], $f['status']],
                    ],
                    'purchase-by-supplier-monthly' => [
                        'title' => 'Purchase By Supplier Monthly',
                        'description' => 'Supplier purchases pivoted by month',
                        'aliases' => ['purchase by supplier monthly'],
                        'keywords' => ['purchase', 'supplier', 'monthly'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['supplier']],
                    ],
                    'purchase-by-item-monthly' => [
                        'title' => 'Purchase By Item Monthly',
                        'description' => 'Item purchases pivoted by month',
                        'aliases' => ['purchase by item monthly'],
                        'keywords' => ['purchase', 'item', 'monthly'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['product']],
                    ],
                    'purchase-master' => [
                        'title' => 'Purchase Master',
                        'description' => 'Detail purchase bill register',
                        'aliases' => ['purchase master', 'purchase register detail', 'purchase report', 'purchase overview', 'purchase summary'],
                        'keywords' => ['purchase', 'master', 'bill'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['supplier'], $f['status']],
                    ],
                ],
            ],
            'tax' => [
                'label' => 'Tax',
                'icon' => 'percentage',
                'description' => 'VAT, TDS, registers and statutory reports',
                'permission' => 'reports.tax.view',
                'reports' => [
                    'sales-register' => [
                        'title' => 'Sales Register',
                        'description' => 'VAT-style sales register',
                        'aliases' => ['sales register', 'tax sales register'],
                        'keywords' => ['register', 'sales', 'vat'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch']],
                    ],
                    'sales-return-register' => [
                        'title' => 'Sales Return Register',
                        'description' => 'VAT-style sales return register',
                        'aliases' => ['sales return register'],
                        'keywords' => ['register', 'sales return'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch']],
                    ],
                    'purchase-register' => [
                        'title' => 'Purchase Register',
                        'description' => 'VAT-style purchase register',
                        'aliases' => ['purchase register', 'tax purchase register'],
                        'keywords' => ['register', 'purchase', 'vat'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch']],
                    ],
                    'purchase-return-register' => [
                        'title' => 'Purchase Return Register',
                        'description' => 'VAT-style purchase return register',
                        'aliases' => ['purchase return register'],
                        'keywords' => ['register', 'purchase return'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch']],
                    ],
                    'vat-summary' => [
                        'title' => 'VAT Summary',
                        'description' => 'VAT input/output summary',
                        'aliases' => ['vat report', 'vat summary', 'tax summary', 'tax report'],
                        'keywords' => ['vat', 'tax', 'summary'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch']],
                    ],
                    'tds' => [
                        'title' => 'TDS',
                        'description' => 'Tax deducted at source report',
                        'aliases' => ['tds', 'tax deducted at source', 'withholding'],
                        'keywords' => ['tds', 'withholding'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch']],
                    ],
                    'annex-13' => [
                        'title' => 'Annex 13',
                        'description' => 'Statutory Annex 13',
                        'aliases' => ['annex 13'],
                        'keywords' => ['annex', '13'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch']],
                    ],
                    'annex-5-materialised-view' => [
                        'title' => 'Annex 5 Materialised View',
                        'description' => 'Statutory Annex 5',
                        'aliases' => ['annex 5'],
                        'keywords' => ['annex', '5'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch']],
                    ],
                ],
            ],
            'inventory' => [
                'label' => 'Inventory',
                'icon' => 'inbox',
                'description' => 'Stock position, movement, ledger and profitability',
                'permission' => 'reports.inventory.view',
                'reports' => [
                    'inventory-position' => [
                        'title' => 'Inventory Position',
                        'description' => 'Current stock position by product and warehouse',
                        'aliases' => ['stock position', 'current stock', 'inventory balance', 'inventory position'],
                        'keywords' => ['stock', 'inventory', 'position'],
                        'default_date_mode' => self::DATE_MODE_AS_OF,
                        'filter_schema' => [$f['asOfDate'], $f['branch'], $f['warehouse'], $f['product'], $f['includeZeroStock']],
                    ],
                    'warehouse-wise-stock' => [
                        'title' => 'Warehouse Wise Stock',
                        'description' => 'Stock split by warehouse',
                        'aliases' => ['warehouse wise stock', 'stock by warehouse'],
                        'keywords' => ['warehouse', 'stock'],
                        'default_date_mode' => self::DATE_MODE_AS_OF,
                        'filter_schema' => [$f['asOfDate'], $f['branch'], $f['warehouse'], $f['product'], $f['productCategory'], $f['includeZeroStock'], $f['includeInactive']],
                    ],
                    'inventory-ageing' => [
                        'title' => 'Inventory Ageing',
                        'description' => 'Stock ageing buckets',
                        'aliases' => ['inventory ageing', 'inventory aging', 'stock ageing'],
                        'keywords' => ['inventory', 'ageing', 'aging'],
                        'default_date_mode' => self::DATE_MODE_AS_OF,
                        'filter_schema' => [$f['asOfDate'], $f['branch'], $f['warehouse'], $f['product'], $f['includeZeroStock']],
                    ],
                    'inventory-movement' => [
                        'title' => 'Inventory Movement',
                        'description' => 'Stock receipts, issues and adjustments for the period',
                        'aliases' => ['inventory movement', 'stock movement'],
                        'keywords' => ['inventory', 'movement', 'stock'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['warehouse'], $f['product']],
                    ],
                    'inventory-ledger' => [
                        'title' => 'Inventory Ledger',
                        'description' => 'Item-level stock ledger',
                        'aliases' => ['inventory ledger', 'stock ledger', 'item ledger'],
                        'keywords' => ['inventory', 'ledger'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['warehouse'], $f['product']],
                    ],
                    'product-profitability' => [
                        'title' => 'Product Profitability',
                        'description' => 'Margin analysis per product',
                        'aliases' => ['product profitability', 'item profitability', 'product margin'],
                        'keywords' => ['profitability', 'margin', 'product'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['product']],
                    ],
                    'inventory-master' => [
                        'title' => 'Inventory Master',
                        'description' => 'Product master list',
                        'aliases' => ['inventory master', 'product master'],
                        'keywords' => ['master', 'inventory', 'product'],
                        'default_date_mode' => self::DATE_MODE_NONE,
                        'filter_schema' => [$f['branch'], $f['productCategory'], $f['includeInactive']],
                    ],
                ],
            ],
            'production' => [
                'label' => 'Production',
                'icon' => 'build',
                'description' => 'Production planning, summary and variance',
                'permission' => 'reports.inventory.view',
                'reports' => [
                    'production-summary' => [
                        'title' => 'Production Summary',
                        'description' => 'Production runs summarised',
                        'aliases' => ['production summary'],
                        'keywords' => ['production', 'summary'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch']],
                    ],
                    'production-variance' => [
                        'title' => 'Production Variance',
                        'description' => 'Planned vs actual production variance',
                        'aliases' => ['production variance'],
                        'keywords' => ['production', 'variance'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch']],
                    ],
                    'production-planning' => [
                        'title' => 'Production Planning',
                        'description' => 'Production plan vs commitments',
                        'aliases' => ['production planning'],
                        'keywords' => ['production', 'planning'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch']],
                    ],
                ],
            ],
            'hr' => [
                'label' => 'HR',
                'icon' => 'team',
                'description' => 'Employees, attendance, leave and payroll reports',
                'permission' => 'reports.hrm.view',
                'reports' => [
                    'employee-master' => [
                        'title' => 'Employee Master',
                        'description' => 'Employee master list',
                        'aliases' => ['employee master', 'staff list'],
                        'keywords' => ['employee', 'master', 'staff'],
                        'default_date_mode' => self::DATE_MODE_NONE,
                        'filter_schema' => [$f['branch'], $f['department'], $f['includeInactive']],
                    ],
                    'attendance-summary' => [
                        'title' => 'Attendance Summary',
                        'description' => 'Attendance summary per employee',
                        'aliases' => ['attendance summary'],
                        'keywords' => ['attendance', 'summary'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['department'], $f['employee']],
                    ],
                    'attendance-detail' => [
                        'title' => 'Attendance Detail',
                        'description' => 'Daily attendance detail',
                        'aliases' => ['attendance detail', 'attendance log'],
                        'keywords' => ['attendance', 'detail'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['department'], $f['employee']],
                    ],
                    'late-attendance' => [
                        'title' => 'Late Attendance',
                        'description' => 'Late attendance log',
                        'aliases' => ['late attendance'],
                        'keywords' => ['late', 'attendance'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['department'], $f['employee']],
                    ],
                    'absent-report' => [
                        'title' => 'Absent Report',
                        'description' => 'Absent days per employee',
                        'aliases' => ['absent report', 'absent log'],
                        'keywords' => ['absent', 'report'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['department'], $f['employee']],
                    ],
                    'leave-summary' => [
                        'title' => 'Leave Summary',
                        'description' => 'Leave taken per employee',
                        'aliases' => ['leave summary'],
                        'keywords' => ['leave', 'summary'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['department'], $f['employee']],
                    ],
                    'leave-balance' => [
                        'title' => 'Leave Balance',
                        'description' => 'Leave balance per employee',
                        'aliases' => ['leave balance'],
                        'keywords' => ['leave', 'balance'],
                        'default_date_mode' => self::DATE_MODE_AS_OF,
                        'filter_schema' => [$f['asOfDate'], $f['branch'], $f['department'], $f['employee']],
                    ],
                    'payroll-summary' => [
                        'title' => 'Payroll Summary',
                        'description' => 'Payroll summary per employee',
                        'aliases' => ['payroll summary', 'salary summary'],
                        'keywords' => ['payroll', 'salary', 'summary'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['department'], $f['employee']],
                    ],
                    'payslip-register' => [
                        'title' => 'Payslip Register',
                        'description' => 'Payslip register',
                        'aliases' => ['payslip register', 'payslip log'],
                        'keywords' => ['payslip', 'register'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['department'], $f['employee']],
                    ],
                    'department-wise-cost' => [
                        'title' => 'Department Wise Cost',
                        'description' => 'Salary cost per department',
                        'aliases' => ['department wise cost', 'department cost'],
                        'keywords' => ['department', 'cost'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['department']],
                    ],
                    'employee-turnover' => [
                        'title' => 'Employee Turnover',
                        'description' => 'Employee joins and exits',
                        'aliases' => ['employee turnover', 'staff turnover'],
                        'keywords' => ['turnover', 'employee'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch'], $f['department']],
                    ],
                ],
            ],
            'system' => [
                'label' => 'System',
                'icon' => 'audit',
                'description' => 'Activity logs, user logs and audit reports',
                'permission' => 'reports.system.view',
                'reports' => [
                    'activity-log' => [
                        'title' => 'Activity Log',
                        'description' => 'System-wide activity log',
                        'aliases' => ['activity log', 'audit log'],
                        'keywords' => ['activity', 'audit', 'log'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['user']],
                    ],
                    'user-log' => [
                        'title' => 'User Log',
                        'description' => 'Per-user login and access log',
                        'aliases' => ['user log', 'login log'],
                        'keywords' => ['user', 'log', 'login'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['user']],
                    ],
                ],
            ],
            'analytics' => [
                'label' => 'Analytics',
                'icon' => 'pie',
                'description' => 'Ratios, exceptions and management analytics',
                'permission' => 'reports.analytics.view',
                'reports' => [
                    'analytics-report' => [
                        'title' => 'Analytics Report',
                        'description' => 'Management analytics overview',
                        'aliases' => ['analytics report', 'management analytics'],
                        'keywords' => ['analytics'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch']],
                    ],
                    'net-trading-assets' => [
                        'title' => 'Net Trading Assets',
                        'description' => 'Net trading asset analysis',
                        'aliases' => ['net trading assets', 'nta'],
                        'keywords' => ['nta', 'trading'],
                        'default_date_mode' => self::DATE_MODE_AS_OF,
                        'filter_schema' => [$f['asOfDate'], $f['branch']],
                    ],
                    'exceptional-report' => [
                        'title' => 'Exceptional Report',
                        'description' => 'Exception-based analytics',
                        'aliases' => ['exceptional report', 'exception report'],
                        'keywords' => ['exception'],
                        'default_date_mode' => self::DATE_MODE_PERIOD,
                        'filter_schema' => [$f['dateRange'], $f['branch']],
                    ],
                    'ratio-analysis' => [
                        'title' => 'Ratio Analysis',
                        'description' => 'Financial ratio analysis',
                        'aliases' => ['ratio analysis', 'financial ratios'],
                        'keywords' => ['ratio', 'analysis'],
                        'default_date_mode' => self::DATE_MODE_AS_OF,
                        'filter_schema' => [$f['asOfDate'], $f['branch']],
                    ],
                ],
            ],
        ];
    }

    public static function filterPresets(): array
    {
        return [
            'dateRange' => ['key' => 'date_range', 'type' => 'dateRange', 'label' => 'Date Range'],
            'asOfDate' => ['key' => 'as_of_date', 'type' => 'date', 'label' => 'As Of Date'],
            'ageingDate' => ['key' => 'ageing_as_of_date', 'type' => 'date', 'label' => 'Ageing As Of'],
            'branch' => ['key' => 'branch_id', 'type' => 'branch', 'label' => 'Branch'],
            'currency' => ['key' => 'currency_id', 'type' => 'select', 'source' => 'currencies', 'label' => 'Currency'],
            'customer' => ['key' => 'customer_id', 'type' => 'select', 'source' => 'customers', 'label' => 'Customer'],
            'supplier' => ['key' => 'supplier_id', 'type' => 'select', 'source' => 'suppliers', 'label' => 'Supplier'],
            'product' => ['key' => 'product_id', 'type' => 'select', 'source' => 'products', 'label' => 'Product'],
            'productCategory' => ['key' => 'category_id', 'type' => 'select', 'source' => 'product-categories', 'label' => 'Category'],
            'warehouse' => ['key' => 'warehouse_id', 'type' => 'select', 'source' => 'warehouses', 'label' => 'Warehouse'],
            'chartOfAccount' => ['key' => 'chart_of_account_id', 'type' => 'select', 'source' => 'chart-of-accounts', 'label' => 'Account'],
            'department' => ['key' => 'department_id', 'type' => 'select', 'source' => 'departments', 'label' => 'Department'],
            'user' => ['key' => 'user_id', 'type' => 'select', 'source' => 'users', 'label' => 'User'],
            'employee' => ['key' => 'employee_id', 'type' => 'select', 'source' => 'employees', 'label' => 'Employee'],
            'status' => ['key' => 'status', 'type' => 'status', 'label' => 'Status'],
            'groupBy' => ['key' => 'group_by', 'type' => 'groupBy', 'label' => 'Group By'],
            'includeZeroBalance' => ['key' => 'include_zero_balance', 'type' => 'checkbox', 'label' => 'Include Zero Balance'],
            'includeZeroStock' => ['key' => 'include_zero_stock', 'type' => 'checkbox', 'label' => 'Include Zero Stock'],
            'includeInactive' => ['key' => 'include_inactive', 'type' => 'checkbox', 'label' => 'Include Inactive'],
            'includeDraft' => ['key' => 'include_draft', 'type' => 'checkbox', 'label' => 'Include Draft'],
        ];
    }

    public static function resolve(string $category, string $reportKey): ?array
    {
        $categories = static::categories();
        $categoryMeta = $categories[$category] ?? null;

        if (!$categoryMeta) {
            return null;
        }

        $reportMeta = $categoryMeta['reports'][$reportKey] ?? null;

        if (!$reportMeta) {
            return null;
        }

        return array_merge([
            'category' => $category,
            'category_label' => $categoryMeta['label'],
            'category_description' => $categoryMeta['description'] ?? '',
            'permission' => $categoryMeta['permission'],
            'report_key' => $reportKey,
            'route_path' => "/reports/{$category}/{$reportKey}",
            'exportable' => true,
        ], $reportMeta);
    }

    /**
     * Public-facing structure for the registry API. Filter schemas are flattened
     * (only key/type/label/source survive) so the frontend can render them
     * without leaking PHP-specific config.
     */
    public static function publicRegistry(?array $userPermissions = null): array
    {
        $hasViewAll = $userPermissions === null
            ? true
            : in_array('reports.view', $userPermissions, true);

        $categories = [];

        foreach (static::categories() as $key => $meta) {
            $canSeeCategory = $hasViewAll
                || ($userPermissions !== null && in_array($meta['permission'], $userPermissions, true));

            if ($userPermissions !== null && !$canSeeCategory) {
                continue;
            }

            $reports = [];
            foreach ($meta['reports'] as $reportKey => $reportMeta) {
                $reports[] = [
                    'key' => $reportKey,
                    'title' => $reportMeta['title'],
                    'description' => $reportMeta['description'] ?? '',
                    'aliases' => $reportMeta['aliases'] ?? [],
                    'keywords' => $reportMeta['keywords'] ?? [],
                    'route_path' => "/reports/{$key}/{$reportKey}",
                    'default_date_mode' => $reportMeta['default_date_mode'] ?? self::DATE_MODE_PERIOD,
                    'filter_schema' => $reportMeta['filter_schema'] ?? [],
                    'exportable' => $reportMeta['exportable'] ?? true,
                ];
            }

            $categories[] = [
                'key' => $key,
                'title' => $meta['label'],
                'icon' => $meta['icon'] ?? null,
                'description' => $meta['description'] ?? '',
                'permission' => $meta['permission'],
                'reports' => $reports,
            ];
        }

        return ['categories' => $categories];
    }
}
