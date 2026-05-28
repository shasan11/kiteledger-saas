<?php

namespace App\Services\AI\Agent;

use App\Services\BranchScopeService;
use Illuminate\Http\Request;

class AiReportResolver
{
    protected array $reports = [
        'trial_balance' => ['title' => 'Trial Balance', 'url' => '/reports/accounting/trial-balance'],
        'general_ledger' => ['title' => 'General Ledger', 'url' => '/reports/accounting/general-ledger'],
        'income_statement' => ['title' => 'Income Statement', 'url' => '/reports/accounting/income-statement'],
        'profit_and_loss' => ['title' => 'Profit and Loss', 'url' => '/reports/accounting/income-statement'],
        'balance_sheet' => ['title' => 'Balance Sheet', 'url' => '/reports/accounting/balance-sheet'],
        'cash_flow' => ['title' => 'Cash Flow', 'url' => '/reports/accounting/cash-flow'],
        'customer_receivable' => ['title' => 'Customer Receivable Summary', 'url' => '/reports/receivable/customer-receivable-summary'],
        'customer_ageing' => ['title' => 'Customer Ageing', 'url' => '/reports/receivable/customer-ageing-summary'],
        'supplier_payable' => ['title' => 'Supplier Payable Summary', 'url' => '/reports/payable/supplier-payable-summary'],
        'supplier_ageing' => ['title' => 'Supplier Ageing', 'url' => '/reports/payable/supplier-ageing-summary'],
        'sales_summary' => ['title' => 'Sales Summary', 'url' => '/reports/sales/sales-summary'],
        'purchase_summary' => ['title' => 'Purchase Summary', 'url' => '/reports/purchase/purchase-summary'],
        'inventory_position' => ['title' => 'Inventory Position', 'url' => '/reports/inventory/inventory-position'],
        'inventory_movement' => ['title' => 'Inventory Movement', 'url' => '/reports/inventory/inventory-movement'],
        'vat_summary' => ['title' => 'VAT Summary', 'url' => '/reports/tax/vat-summary'],
    ];

    public function __construct(protected BranchScopeService $scope) {}

    public function resolve(Request $request, string $message): array
    {
        $key = $this->detectReport($message);
        $report = $this->reports[$key];
        $dates = $this->detectDates($message);
        $branchId = $this->scope->selectedBranchId($request, $request->user());

        $filters = array_filter([
            'from_date' => $dates['from_date'] ?? null,
            'to_date' => $dates['to_date'] ?? null,
            'branch_id' => $branchId,
        ]);

        return [
            'type' => 'report',
            'report_key' => $key,
            'title' => $report['title'],
            'filters' => $filters,
            'summary' => ['note' => 'Open the report for complete figures. AI can explain it when report data is provided.'],
            'open_url' => $this->buildUrl($report['url'], $filters),
        ];
    }

    private function detectReport(string $message): string
    {
        $m = mb_strtolower($message);
        $rules = [
            'trial_balance' => ['trial balance'],
            'general_ledger' => ['general ledger', 'ledger'],
            'income_statement' => ['income statement'],
            'profit_and_loss' => ['profit and loss', 'p&l', 'profit loss'],
            'balance_sheet' => ['balance sheet'],
            'cash_flow' => ['cash flow'],
            'customer_ageing' => ['customer ageing', 'customer aging', 'invoice age'],
            'customer_receivable' => ['customer receivable', 'receivable'],
            'supplier_ageing' => ['supplier ageing', 'supplier aging', 'bill age'],
            'supplier_payable' => ['supplier payable', 'payable'],
            'sales_summary' => ['sales summary', 'sales report'],
            'purchase_summary' => ['purchase summary', 'purchase report'],
            'inventory_position' => ['inventory position', 'stock position'],
            'inventory_movement' => ['inventory movement', 'stock movement'],
            'vat_summary' => ['vat summary', 'tax summary'],
        ];

        foreach ($rules as $key => $needles) {
            foreach ($needles as $needle) {
                if (str_contains($m, $needle)) return $key;
            }
        }

        return 'income_statement';
    }

    private function detectDates(string $message): array
    {
        $m = mb_strtolower($message);
        if (str_contains($m, 'today')) {
            return ['from_date' => now()->toDateString(), 'to_date' => now()->toDateString()];
        }
        if (str_contains($m, 'this month')) {
            return ['from_date' => now()->startOfMonth()->toDateString(), 'to_date' => now()->endOfMonth()->toDateString()];
        }
        if (str_contains($m, 'last month')) {
            return ['from_date' => now()->subMonthNoOverflow()->startOfMonth()->toDateString(), 'to_date' => now()->subMonthNoOverflow()->endOfMonth()->toDateString()];
        }
        return ['from_date' => now()->startOfMonth()->toDateString(), 'to_date' => now()->toDateString()];
    }

    private function buildUrl(string $url, array $filters): string
    {
        if (empty($filters)) return $url;
        return $url . '?' . http_build_query($filters);
    }
}
