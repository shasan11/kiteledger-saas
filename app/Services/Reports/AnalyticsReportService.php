<?php

namespace App\Services\Reports;

use App\Models\ChartOfAccount;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\PurchaseBill;

class AnalyticsReportService extends BaseReportService
{
    public function __construct(
        protected readonly SalesReportService $salesReportService,
        protected readonly PurchaseReportService $purchaseReportService,
        protected readonly ReceivableReportService $receivableReportService,
        protected readonly PayableReportService $payableReportService,
        protected readonly InventoryReportService $inventoryReportService,
        protected readonly AccountingReportService $accountingReportService,
    ) {
    }

    public function build(string $reportKey, array $filters, array $meta): array
    {
        return match ($reportKey) {
            'analytics-report' => $this->analyticsReport($reportKey, $filters, $meta),
            'net-trading-assets' => $this->netTradingAssets($reportKey, $filters, $meta),
            'exceptional-report' => $this->exceptionalReport($reportKey, $filters, $meta),
            'ratio-analysis' => $this->ratioAnalysis($reportKey, $filters, $meta),
            default => throw new \InvalidArgumentException('Unsupported analytics report.'),
        };
    }

    protected function analyticsReport(string $reportKey, array $filters, array $meta): array
    {
        $sales = $this->salesReportService->build('sales-summary', $filters, ['title' => 'Sales Summary', 'category_label' => $meta['category_label']]);
        $purchase = $this->purchaseReportService->build('purchase-master', $filters, ['title' => 'Purchase Master', 'category_label' => $meta['category_label']]);
        $receivable = $this->receivableReportService->build('customer-receivable-summary', $filters, ['title' => 'Receivable', 'category_label' => $meta['category_label']]);
        $payable = $this->payableReportService->build('supplier-payable-summary', $filters, ['title' => 'Payable', 'category_label' => $meta['category_label']]);
        $inventory = $this->inventoryReportService->build('inventory-position', $filters, ['title' => 'Inventory', 'category_label' => $meta['category_label']]);

        $rows = [
            ['metric' => 'Total Sales', 'value' => $this->total($sales['rows'], 'total_sales')],
            ['metric' => 'Total Purchase', 'value' => $this->total($purchase['rows'], 'grand_total')],
            ['metric' => 'Gross Profit', 'value' => round($this->total($sales['rows'], 'total_sales') - $this->total($purchase['rows'], 'grand_total'), 2)],
            ['metric' => 'Receivable', 'value' => $this->total($receivable['rows'], 'balance_due')],
            ['metric' => 'Payable', 'value' => $this->total($payable['rows'], 'balance_due')],
            ['metric' => 'Cash/Bank Balance', 'value' => $this->accountingReportService->build('cash-flow-summary', $filters, ['title' => 'Cash Flow', 'category_label' => $meta['category_label']])['totals']['closing_balance'] ?? 0],
            ['metric' => 'Inventory Value', 'value' => $this->total($inventory['rows'], 'stock_value')],
        ];

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Metric', 'key' => 'metric'],
            ['title' => 'Value', 'key' => 'value'],
        ], $rows);
    }

    protected function netTradingAssets(string $reportKey, array $filters, array $meta): array
    {
        $inventory = $this->inventoryReportService->build('inventory-position', $filters, ['title' => 'Inventory Position', 'category_label' => $meta['category_label']]);
        $receivable = $this->receivableReportService->build('customer-receivable-summary', $filters, ['title' => 'Receivable', 'category_label' => $meta['category_label']]);
        $payable = $this->payableReportService->build('supplier-payable-summary', $filters, ['title' => 'Payable', 'category_label' => $meta['category_label']]);
        $cash = $this->accountingReportService->build('cash-flow-summary', $filters, ['title' => 'Cash Flow', 'category_label' => $meta['category_label']]);
        $inventoryValue = $this->total($inventory['rows'], 'stock_value');
        $receivableValue = $this->total($receivable['rows'], 'balance_due');
        $payableValue = $this->total($payable['rows'], 'balance_due');
        $cashBank = $cash['totals']['closing_balance'] ?? 0;
        $rows = [[
            'inventory_value' => $inventoryValue,
            'customer_receivables' => $receivableValue,
            'cash_bank' => $cashBank,
            'supplier_payables' => $payableValue,
            'net_trading_assets' => round($inventoryValue + $receivableValue + $cashBank - $payableValue, 2),
        ]];

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Inventory Value', 'key' => 'inventory_value'],
            ['title' => 'Customer Receivables', 'key' => 'customer_receivables'],
            ['title' => 'Cash/Bank', 'key' => 'cash_bank'],
            ['title' => 'Supplier Payables', 'key' => 'supplier_payables'],
            ['title' => 'Net Trading Assets', 'key' => 'net_trading_assets'],
        ], $rows);
    }

    protected function exceptionalReport(string $reportKey, array $filters, array $meta): array
    {
        $rows = [];
        foreach ($this->inventoryReportService->build('inventory-position', $filters, ['title' => 'Inventory Position', 'category_label' => $meta['category_label']])['rows'] as $row) {
            if (($row['qty_on_hand'] ?? 0) < 0) {
                $rows[] = ['exception_type' => 'Negative stock', 'reference' => $row['product_name'], 'amount' => $row['qty_on_hand'], 'status' => 'Open'];
            }
            if (($row['qty_on_hand'] ?? 0) < ($row['reorder_level'] ?? 0)) {
                $rows[] = ['exception_type' => 'Below reorder level', 'reference' => $row['product_name'], 'amount' => $row['qty_on_hand'], 'status' => 'Open'];
            }
        }
        foreach (Invoice::query()->where('balance_due', '>', 0)->whereDate('due_date', '<', now()->toDateString())->get() as $invoice) {
            $rows[] = ['exception_type' => 'Overdue invoice', 'reference' => $invoice->invoice_no, 'amount' => $invoice->balance_due, 'status' => $invoice->status];
        }
        foreach (PurchaseBill::query()->where('balance_due', '>', 0)->whereDate('due_date', '<', now()->toDateString())->get() as $bill) {
            $rows[] = ['exception_type' => 'Overdue purchase bill', 'reference' => $bill->bill_no, 'amount' => $bill->balance_due, 'status' => $bill->status];
        }
        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Exception Type', 'key' => 'exception_type'],
            ['title' => 'Reference', 'key' => 'reference'],
            ['title' => 'Amount', 'key' => 'amount'],
            ['title' => 'Status', 'key' => 'status'],
        ], $rows);
    }

    protected function ratioAnalysis(string $reportKey, array $filters, array $meta): array
    {
        $balanceSheet = $this->accountingReportService->build('balance-sheet', $filters, ['title' => 'Balance Sheet', 'category_label' => $meta['category_label']]);
        $incomeStatement = $this->accountingReportService->build('income-statement', $filters, ['title' => 'Income Statement', 'category_label' => $meta['category_label']]);
        $assets = collect($balanceSheet['rows'])->where('section', 'Asset')->sum('balance');
        $liabilities = collect($balanceSheet['rows'])->where('section', 'Liability')->sum('balance');
        $sales = max(collect($incomeStatement['rows'])->where('section', 'Income')->sum('amount'), 0);
        $expenses = max(collect($incomeStatement['rows'])->where('section', 'Expense')->sum('amount'), 0);
        $grossProfit = $sales - $expenses;
        $rows = [
            ['ratio' => 'Current Ratio', 'formula' => 'Current Assets / Current Liabilities', 'value' => $liabilities ? round($assets / $liabilities, 2) : null, 'interpretation' => $liabilities ? ($assets / $liabilities >= 1 ? 'Healthy' : 'Watch') : 'N/A'],
            ['ratio' => 'Quick Ratio', 'formula' => 'Quick Assets / Current Liabilities', 'value' => $liabilities ? round(($assets * 0.8) / $liabilities, 2) : null, 'interpretation' => $liabilities ? (($assets * 0.8) / $liabilities >= 1 ? 'Healthy' : 'Watch') : 'N/A'],
            ['ratio' => 'Gross Profit Margin', 'formula' => 'Gross Profit / Sales', 'value' => $sales ? round(($grossProfit / $sales) * 100, 2) : null, 'interpretation' => $sales ? (($grossProfit / $sales) >= 0.2 ? 'Healthy' : 'Watch') : 'N/A'],
            ['ratio' => 'Net Profit Margin', 'formula' => 'Net Profit / Sales', 'value' => $sales ? round(($grossProfit / $sales) * 100, 2) : null, 'interpretation' => $sales ? (($grossProfit / $sales) >= 0.1 ? 'Healthy' : 'Watch') : 'N/A'],
        ];
        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Ratio', 'key' => 'ratio'],
            ['title' => 'Formula', 'key' => 'formula'],
            ['title' => 'Value', 'key' => 'value'],
            ['title' => 'Interpretation', 'key' => 'interpretation'],
        ], $rows);
    }
}
