export const REPORT_CATEGORIES = [
  {
    key: 'accounting',
    title: 'Accounting',
    permission: 'reports.financial.view',
    reports: [
      ['transaction-list', 'Transaction List'],
      ['journal-report', 'Journal Report'],
      ['general-ledger-summary', 'General Ledger Summary'],
      ['detail-general-ledger', 'Detail General Ledger'],
      ['gl-master', 'GL Master'],
      ['trial-balance', 'Trial Balance'],
      ['income-statement', 'Income Statement'],
      ['balance-sheet', 'Balance Sheet'],
      ['cash-flow-summary', 'Cash Flow Summary'],
    ],
  },
  {
    key: 'receivable',
    title: 'Receivable',
    permission: 'reports.financial.view',
    reports: [
      ['customer-receivable-summary', 'Customer Receivable Summary'],
      ['customer-ageing-summary', 'Customer Ageing Summary'],
      ['invoice-age', 'Invoice Age'],
      ['customer-statement', 'Customer Statement'],
    ],
  },
  {
    key: 'payable',
    title: 'Payable',
    permission: 'reports.financial.view',
    reports: [
      ['supplier-payable-summary', 'Supplier Payable Summary'],
      ['supplier-ageing-summary', 'Supplier Ageing Summary'],
      ['purchase-bill-age', 'Purchase Bill Age'],
      ['supplier-statement', 'Supplier Statement'],
    ],
  },
  {
    key: 'sales',
    title: 'Sales',
    permission: 'reports.sales.view',
    reports: [
      ['sales-by-customer', 'Sales By Customer'],
      ['sales-by-item', 'Sales By Item'],
      ['sales-by-customer-monthly', 'Sales By Customer Monthly'],
      ['sales-by-item-monthly', 'Sales By Item Monthly'],
      ['sales-master', 'Sales Master'],
      ['sales-summary', 'Sales Summary'],
    ],
  },
  {
    key: 'purchase',
    title: 'Purchase',
    permission: 'reports.purchase.view',
    reports: [
      ['purchase-by-supplier', 'Purchase By Supplier'],
      ['purchase-by-item', 'Purchase By Item'],
      ['purchase-by-supplier-monthly', 'Purchase By Supplier Monthly'],
      ['purchase-by-item-monthly', 'Purchase By Item Monthly'],
      ['purchase-master', 'Purchase Master'],
    ],
  },
  {
    key: 'tax',
    title: 'Tax',
    permission: 'reports.tax.view',
    reports: [
      ['sales-register', 'Sales Register'],
      ['sales-return-register', 'Sales Return Register'],
      ['purchase-register', 'Purchase Register'],
      ['purchase-return-register', 'Purchase Return Register'],
      ['vat-summary', 'VAT Summary'],
      ['tds', 'TDS'],
      ['annex-13', 'Annex 13'],
      ['annex-5-materialised-view', 'Annex 5 Materialised View'],
    ],
  },
  {
    key: 'inventory',
    title: 'Inventory',
    permission: 'reports.inventory.view',
    reports: [
      ['inventory-position', 'Inventory Position'],
      ['inventory-ageing', 'Inventory Ageing'],
      ['inventory-movement', 'Inventory Movement'],
      ['inventory-ledger', 'Inventory Ledger'],
      ['product-profitability', 'Product Profitability'],
      ['inventory-master', 'Inventory Master'],
    ],
  },
  {
    key: 'production',
    title: 'Production',
    permission: 'reports.inventory.view',
    reports: [
      ['production-summary', 'Production Summary'],
      ['production-variance', 'Production Variance'],
      ['production-planning', 'Production Planning'],
    ],
  },
  {
    key: 'hr',
    title: 'HR',
    permission: 'reports.hrm.view',
    reports: [
      ['employee-master', 'Employee Master'],
      ['attendance-summary', 'Attendance Summary'],
      ['attendance-detail', 'Attendance Detail'],
      ['late-attendance', 'Late Attendance'],
      ['absent-report', 'Absent Report'],
      ['leave-summary', 'Leave Summary'],
      ['leave-balance', 'Leave Balance'],
      ['payroll-summary', 'Payroll Summary'],
      ['payslip-register', 'Payslip Register'],
      ['department-wise-cost', 'Department Wise Cost'],
      ['employee-turnover', 'Employee Turnover'],
    ],
  },
  {
    key: 'system',
    title: 'System',
    permission: 'reports.system.view',
    reports: [
      ['activity-log', 'Activity Log'],
      ['user-log', 'User Log'],
    ],
  },
  {
    key: 'analytics',
    title: 'Analytics',
    permission: 'reports.analytics.view',
    reports: [
      ['analytics-report', 'Analytics Report'],
      ['net-trading-assets', 'Net Trading Assets'],
      ['exceptional-report', 'Exceptional Report'],
      ['ratio-analysis', 'Ratio Analysis'],
    ],
  },
];

export const FILTER_PRESETS = {
  dateRange: { key: 'date_range', type: 'dateRange', label: 'Date Range' },
  asOfDate: { key: 'as_of_date', type: 'date', label: 'As Of Date' },
  ageingDate: { key: 'ageing_as_of_date', type: 'date', label: 'Ageing As Of' },
  branch: { key: 'branch_id', type: 'branch', label: 'Branch' },
  customer: { key: 'customer_id', type: 'select', source: 'customers', label: 'Customer' },
  supplier: { key: 'supplier_id', type: 'select', source: 'suppliers', label: 'Supplier' },
  product: { key: 'product_id', type: 'select', source: 'products', label: 'Product' },
  warehouse: { key: 'warehouse_id', type: 'select', source: 'warehouses', label: 'Warehouse' },
  account: { key: 'chart_of_account_id', type: 'select', source: 'chartOfAccounts', label: 'Account' },
  department: { key: 'department_id', type: 'select', source: 'departments', label: 'Department' },
  employee: { key: 'employee_id', type: 'select', source: 'employees', label: 'Employee' },
  user: { key: 'user_id', type: 'select', source: 'users', label: 'User' },
  status: { key: 'status', type: 'status', label: 'Status' },
  groupBy: { key: 'group_by', type: 'groupBy', label: 'Group By' },
  includeZeroBalance: { key: 'include_zero_balance', type: 'checkbox', label: 'Include Zero Balance' },
  includeZeroStock: { key: 'include_zero_stock', type: 'checkbox', label: 'Include Zero Stock' },
  includeInactive: { key: 'include_inactive', type: 'checkbox', label: 'Include Inactive' },
};

export const REPORT_CONFIG = Object.fromEntries(
  REPORT_CATEGORIES.flatMap((category) =>
    category.reports.map(([reportKey, title]) => {
      const path = `${category.key}/${reportKey}`;
      const filterSchema = (() => {
        if (['trial-balance', 'balance-sheet'].includes(reportKey)) return [FILTER_PRESETS.asOfDate, FILTER_PRESETS.branch, FILTER_PRESETS.includeZeroBalance];
        if (['customer-receivable-summary', 'supplier-payable-summary'].includes(reportKey)) return [FILTER_PRESETS.asOfDate, FILTER_PRESETS.branch, category.key === 'receivable' ? FILTER_PRESETS.customer : FILTER_PRESETS.supplier, FILTER_PRESETS.includeZeroBalance];
        if (['customer-ageing-summary', 'invoice-age', 'supplier-ageing-summary', 'purchase-bill-age'].includes(reportKey)) return [FILTER_PRESETS.ageingDate, FILTER_PRESETS.branch, category.key === 'receivable' ? FILTER_PRESETS.customer : FILTER_PRESETS.supplier, FILTER_PRESETS.includeZeroBalance];
        if (['detail-general-ledger'].includes(reportKey)) return [FILTER_PRESETS.dateRange, FILTER_PRESETS.branch, FILTER_PRESETS.account];
        if (['gl-master'].includes(reportKey)) return [FILTER_PRESETS.branch, FILTER_PRESETS.includeInactive];
        if (['inventory-position', 'inventory-ageing'].includes(reportKey)) return [FILTER_PRESETS.asOfDate, FILTER_PRESETS.branch, FILTER_PRESETS.product, FILTER_PRESETS.warehouse, FILTER_PRESETS.includeZeroStock];
        if (['inventory-ledger'].includes(reportKey)) return [FILTER_PRESETS.dateRange, FILTER_PRESETS.branch, FILTER_PRESETS.product, FILTER_PRESETS.warehouse];
        if (['employee-master'].includes(reportKey)) return [FILTER_PRESETS.branch, FILTER_PRESETS.department, FILTER_PRESETS.includeInactive];
        if (['attendance-summary', 'attendance-detail', 'late-attendance', 'absent-report', 'leave-summary', 'leave-balance', 'payroll-summary', 'payslip-register', 'department-wise-cost', 'employee-turnover'].includes(reportKey)) return [FILTER_PRESETS.dateRange, FILTER_PRESETS.branch, FILTER_PRESETS.department, FILTER_PRESETS.user];
        if (['sales-summary'].includes(reportKey)) return [FILTER_PRESETS.dateRange, FILTER_PRESETS.branch, FILTER_PRESETS.groupBy];
        return [FILTER_PRESETS.dateRange, FILTER_PRESETS.branch, ...(category.key === 'sales' ? [FILTER_PRESETS.customer, FILTER_PRESETS.product] : []), ...(category.key === 'purchase' ? [FILTER_PRESETS.supplier, FILTER_PRESETS.product] : []), ...(category.key === 'tax' ? [] : []), FILTER_PRESETS.status];
      })();

      return [
        path,
        {
          title,
          category: category.key,
          categoryTitle: category.title,
          reportKey,
          permission: category.permission,
          description: `${title} report`,
          filterSchema,
        },
      ];
    }),
  ),
);

export function hasReportPermission(permissions = [], permission) {
  return permissions.includes('reports.view') || permissions.includes(permission);
}
