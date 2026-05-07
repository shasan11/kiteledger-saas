<?php

use App\Http\Controllers\ReportsController;

$reportPages = [
    'accounting' => [
        'transaction-list' => 'App/Reports/Accounting/TransactionList',
        'journal-report' => 'App/Reports/Accounting/JournalReport',
        'general-ledger-summary' => 'App/Reports/Accounting/GeneralLedgerSummary',
        'detail-general-ledger' => 'App/Reports/Accounting/DetailGeneralLedger',
        'gl-master' => 'App/Reports/Accounting/GlMaster',
        'trial-balance' => 'App/Reports/Accounting/TrialBalance',
        'income-statement' => 'App/Reports/Accounting/IncomeStatement',
        'balance-sheet' => 'App/Reports/Accounting/BalanceSheet',
        'cash-flow-summary' => 'App/Reports/Accounting/CashFlowSummary',
    ],
    'receivable' => [
        'customer-receivable-summary' => 'App/Reports/Receivable/CustomerReceivableSummary',
        'customer-ageing-summary' => 'App/Reports/Receivable/CustomerAgeingSummary',
        'invoice-age' => 'App/Reports/Receivable/InvoiceAge',
        'customer-statement' => 'App/Reports/Receivable/CustomerStatement',
    ],
    'payable' => [
        'supplier-payable-summary' => 'App/Reports/Payable/SupplierPayableSummary',
        'supplier-ageing-summary' => 'App/Reports/Payable/SupplierAgeingSummary',
        'purchase-bill-age' => 'App/Reports/Payable/PurchaseBillAge',
        'supplier-statement' => 'App/Reports/Payable/SupplierStatement',
    ],
    'sales' => [
        'sales-by-customer' => 'App/Reports/Sales/SalesByCustomer',
        'sales-by-item' => 'App/Reports/Sales/SalesByItem',
        'sales-by-customer-monthly' => 'App/Reports/Sales/SalesByCustomerMonthly',
        'sales-by-item-monthly' => 'App/Reports/Sales/SalesByItemMonthly',
        'sales-master' => 'App/Reports/Sales/SalesMaster',
        'sales-summary' => 'App/Reports/Sales/SalesSummary',
    ],
    'purchase' => [
        'purchase-by-supplier' => 'App/Reports/Purchase/PurchaseBySupplier',
        'purchase-by-item' => 'App/Reports/Purchase/PurchaseByItem',
        'purchase-by-supplier-monthly' => 'App/Reports/Purchase/PurchaseBySupplierMonthly',
        'purchase-by-item-monthly' => 'App/Reports/Purchase/PurchaseByItemMonthly',
        'purchase-master' => 'App/Reports/Purchase/PurchaseMaster',
    ],
    'tax' => [
        'sales-register' => 'App/Reports/Tax/SalesRegister',
        'sales-return-register' => 'App/Reports/Tax/SalesReturnRegister',
        'purchase-register' => 'App/Reports/Tax/PurchaseRegister',
        'purchase-return-register' => 'App/Reports/Tax/PurchaseReturnRegister',
        'vat-summary' => 'App/Reports/Tax/VatSummary',
        'tds' => 'App/Reports/Tax/Tds',
        'annex-13' => 'App/Reports/Tax/Annex13',
        'annex-5-materialised-view' => 'App/Reports/Tax/Annex5MaterialisedView',
    ],
    'inventory' => [
        'inventory-position' => 'App/Reports/Inventory/InventoryPosition',
        'inventory-ageing' => 'App/Reports/Inventory/InventoryAgeing',
        'inventory-movement' => 'App/Reports/Inventory/InventoryMovement',
        'inventory-ledger' => 'App/Reports/Inventory/InventoryLedger',
        'product-profitability' => 'App/Reports/Inventory/ProductProfitability',
        'inventory-master' => 'App/Reports/Inventory/InventoryMaster',
    ],
    'production' => [
        'production-summary' => 'App/Reports/Production/ProductionSummary',
        'production-variance' => 'App/Reports/Production/ProductionVariance',
        'production-planning' => 'App/Reports/Production/ProductionPlanning',
    ],
    'hr' => [
        'employee-master' => 'App/Reports/Hr/EmployeeMaster',
        'attendance-summary' => 'App/Reports/Hr/AttendanceSummary',
        'attendance-detail' => 'App/Reports/Hr/AttendanceDetail',
        'late-attendance' => 'App/Reports/Hr/LateAttendance',
        'absent-report' => 'App/Reports/Hr/AbsentReport',
        'leave-summary' => 'App/Reports/Hr/LeaveSummary',
        'leave-balance' => 'App/Reports/Hr/LeaveBalance',
        'payroll-summary' => 'App/Reports/Hr/PayrollSummary',
        'payslip-register' => 'App/Reports/Hr/PayslipRegister',
        'department-wise-cost' => 'App/Reports/Hr/DepartmentWiseCost',
        'employee-turnover' => 'App/Reports/Hr/EmployeeTurnover',
    ],
    'system' => [
        'activity-log' => 'App/Reports/System/ActivityLog',
        'user-log' => 'App/Reports/System/UserLog',
    ],
    'analytics' => [
        'analytics-report' => 'App/Reports/Analytics/AnalyticsReport',
        'net-trading-assets' => 'App/Reports/Analytics/NetTradingAssets',
        'exceptional-report' => 'App/Reports/Analytics/ExceptionalReport',
        'ratio-analysis' => 'App/Reports/Analytics/RatioAnalysis',
    ],
];

Route::get('/reports', [ReportsController::class, 'index'])->name('reports.index');

foreach ($reportPages as $category => $reports) {
    foreach ($reports as $slug => $component) {
        Route::get("/reports/{$category}/{$slug}", fn (ReportsController $controller, \Illuminate\Http\Request $request) => $controller->show($request, $component))
            ->name("reports.{$category}.{$slug}");
    }
}
