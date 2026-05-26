<?php

namespace App\Services\Search\Definitions;

use Illuminate\Support\Str;

class ReportSearchDefinitions
{
    public static function items(): array
    {
        $reports = [
            'accounting' => ['transaction-list', 'journal-report', 'general-ledger-summary', 'detail-general-ledger', 'gl-master', 'trial-balance', 'income-statement', 'balance-sheet', 'cash-flow-summary'],
            'receivable' => ['customer-receivable-summary', 'customer-ageing-summary', 'invoice-age', 'customer-statement'],
            'payable' => ['supplier-payable-summary', 'supplier-ageing-summary', 'purchase-bill-age', 'supplier-statement'],
            'sales' => ['sales-by-customer', 'sales-by-item', 'sales-by-customer-monthly', 'sales-by-item-monthly', 'sales-master', 'sales-summary'],
            'purchase' => ['purchase-by-supplier', 'purchase-by-item', 'purchase-by-supplier-monthly', 'purchase-by-item-monthly', 'purchase-master'],
            'tax' => ['sales-register', 'sales-return-register', 'purchase-register', 'purchase-return-register', 'vat-summary', 'tds', 'annex-13', 'annex-5-materialised-view'],
            'inventory' => ['inventory-position', 'warehouse-wise-stock', 'inventory-ageing', 'inventory-movement', 'inventory-ledger', 'product-profitability', 'inventory-master'],
            'production' => ['production-summary', 'production-variance', 'production-planning'],
            'hr' => ['employee-master', 'attendance-summary', 'attendance-detail', 'late-attendance', 'absent-report', 'leave-summary', 'leave-balance', 'payroll-summary', 'payslip-register', 'department-wise-cost', 'employee-turnover'],
            'system' => ['activity-log', 'user-log'],
            'analytics' => ['analytics-report', 'net-trading-assets', 'exceptional-report', 'ratio-analysis'],
        ];

        $items = [
            ['module_key' => 'reports', 'module' => 'Reports', 'title' => 'Reports', 'subtitle' => 'Report center', 'url' => '/reports', 'keywords' => ['analytics'], 'icon' => 'file-search'],
        ];

        foreach ($reports as $category => $slugs) {
            foreach ($slugs as $slug) {
                $items[] = [
                    'module_key' => 'reports',
                    'module' => 'Reports',
                    'title' => Str::headline($slug),
                    'subtitle' => Str::headline($category),
                    'url' => "/reports/{$category}/{$slug}",
                    'keywords' => [$category, str_replace('-', ' ', $slug)],
                    'permission' => 'reports.view',
                    'icon' => 'file-search',
                ];
            }
        }

        return $items;
    }
}
