<?php

namespace App\Services\Reports;

class ReportRegistry
{
    public static function categories(): array
    {
        return [
            'accounting' => [
                'label' => 'Accounting',
                'permission' => 'reports.financial.view',
                'reports' => [
                    'transaction-list' => ['title' => 'Transaction List'],
                    'journal-report' => ['title' => 'Journal Report'],
                    'general-ledger-summary' => ['title' => 'General Ledger Summary'],
                    'detail-general-ledger' => ['title' => 'Detail General Ledger'],
                    'gl-master' => ['title' => 'GL Master'],
                    'trial-balance' => ['title' => 'Trial Balance'],
                    'income-statement' => ['title' => 'Income Statement'],
                    'balance-sheet' => ['title' => 'Balance Sheet'],
                    'cash-flow-summary' => ['title' => 'Cash Flow Summary'],
                ],
            ],
            'receivable' => [
                'label' => 'Receivable',
                'permission' => 'reports.financial.view',
                'reports' => [
                    'customer-receivable-summary' => ['title' => 'Customer Receivable Summary'],
                    'customer-ageing-summary' => ['title' => 'Customer Ageing Summary'],
                    'invoice-age' => ['title' => 'Invoice Age'],
                    'customer-statement' => ['title' => 'Customer Statement'],
                ],
            ],
            'payable' => [
                'label' => 'Payable',
                'permission' => 'reports.financial.view',
                'reports' => [
                    'supplier-payable-summary' => ['title' => 'Supplier Payable Summary'],
                    'supplier-ageing-summary' => ['title' => 'Supplier Ageing Summary'],
                    'purchase-bill-age' => ['title' => 'Purchase Bill Age'],
                    'supplier-statement' => ['title' => 'Supplier Statement'],
                ],
            ],
            'sales' => [
                'label' => 'Sales',
                'permission' => 'reports.sales.view',
                'reports' => [
                    'sales-by-customer' => ['title' => 'Sales By Customer'],
                    'sales-by-item' => ['title' => 'Sales By Item'],
                    'sales-by-customer-monthly' => ['title' => 'Sales By Customer Monthly'],
                    'sales-by-item-monthly' => ['title' => 'Sales By Item Monthly'],
                    'sales-master' => ['title' => 'Sales Master'],
                    'sales-summary' => ['title' => 'Sales Summary'],
                ],
            ],
            'purchase' => [
                'label' => 'Purchase',
                'permission' => 'reports.purchase.view',
                'reports' => [
                    'purchase-by-supplier' => ['title' => 'Purchase By Supplier'],
                    'purchase-by-item' => ['title' => 'Purchase By Item'],
                    'purchase-by-supplier-monthly' => ['title' => 'Purchase By Supplier Monthly'],
                    'purchase-by-item-monthly' => ['title' => 'Purchase By Item Monthly'],
                    'purchase-master' => ['title' => 'Purchase Master'],
                ],
            ],
            'tax' => [
                'label' => 'Tax',
                'permission' => 'reports.tax.view',
                'reports' => [
                    'sales-register' => ['title' => 'Sales Register'],
                    'sales-return-register' => ['title' => 'Sales Return Register'],
                    'purchase-register' => ['title' => 'Purchase Register'],
                    'purchase-return-register' => ['title' => 'Purchase Return Register'],
                    'vat-summary' => ['title' => 'VAT Summary'],
                    'tds' => ['title' => 'TDS'],
                    'annex-13' => ['title' => 'Annex 13'],
                    'annex-5-materialised-view' => ['title' => 'Annex 5 Materialised View'],
                ],
            ],
            'inventory' => [
                'label' => 'Inventory',
                'permission' => 'reports.inventory.view',
                'reports' => [
                    'inventory-position' => ['title' => 'Inventory Position'],
                    'inventory-ageing' => ['title' => 'Inventory Ageing'],
                    'inventory-movement' => ['title' => 'Inventory Movement'],
                    'inventory-ledger' => ['title' => 'Inventory Ledger'],
                    'product-profitability' => ['title' => 'Product Profitability'],
                    'inventory-master' => ['title' => 'Inventory Master'],
                ],
            ],
            'production' => [
                'label' => 'Production',
                'permission' => 'reports.inventory.view',
                'reports' => [
                    'production-summary' => ['title' => 'Production Summary'],
                    'production-variance' => ['title' => 'Production Variance'],
                    'production-planning' => ['title' => 'Production Planning'],
                ],
            ],
            'hr' => [
                'label' => 'HR',
                'permission' => 'reports.hrm.view',
                'reports' => [
                    'employee-master' => ['title' => 'Employee Master'],
                    'attendance-summary' => ['title' => 'Attendance Summary'],
                    'attendance-detail' => ['title' => 'Attendance Detail'],
                    'late-attendance' => ['title' => 'Late Attendance'],
                    'absent-report' => ['title' => 'Absent Report'],
                    'leave-summary' => ['title' => 'Leave Summary'],
                    'leave-balance' => ['title' => 'Leave Balance'],
                    'payroll-summary' => ['title' => 'Payroll Summary'],
                    'payslip-register' => ['title' => 'Payslip Register'],
                    'department-wise-cost' => ['title' => 'Department Wise Cost'],
                    'employee-turnover' => ['title' => 'Employee Turnover'],
                ],
            ],
            'system' => [
                'label' => 'System',
                'permission' => 'reports.system.view',
                'reports' => [
                    'activity-log' => ['title' => 'Activity Log'],
                    'user-log' => ['title' => 'User Log'],
                ],
            ],
            'analytics' => [
                'label' => 'Analytics',
                'permission' => 'reports.analytics.view',
                'reports' => [
                    'analytics-report' => ['title' => 'Analytics Report'],
                    'net-trading-assets' => ['title' => 'Net Trading Assets'],
                    'exceptional-report' => ['title' => 'Exceptional Report'],
                    'ratio-analysis' => ['title' => 'Ratio Analysis'],
                ],
            ],
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

        return [
            'category' => $category,
            'category_label' => $categoryMeta['label'],
            'permission' => $categoryMeta['permission'],
            'report_key' => $reportKey,
            ...$reportMeta,
        ];
    }
}
