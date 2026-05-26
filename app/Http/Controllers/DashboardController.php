<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request, DashboardService $dashboardService): JsonResponse
    {
        $filters = [
            'branch_id' => $request->query('branch_id'),
            'date_from' => $request->query('date_from'),
            'date_to' => $request->query('date_to'),
            'user_id' => $request->user()?->id,
        ];

        $data = [
            'financial_summary' => $dashboardService->getFinancialSummary($filters),
            'metric_sparklines' => $dashboardService->getMetricSparklines($filters),
            'cash_position' => $dashboardService->getCashPosition($filters),
            'revenue_expense_profit_chart' => $dashboardService->getRevenueExpenseChart($filters),
            'recent_transactions' => $dashboardService->getRecentTransactions($filters),
            'branches' => $dashboardService->getBranches(),
        ];

        $data['sales_summary'] = $dashboardService->getSalesSummary($filters);
        $data['purchase_summary'] = $dashboardService->getPurchaseSummary($filters);
        $data['cashflow_summary'] = $dashboardService->getCashflowSummary($filters);
        $data['inventory_summary'] = $dashboardService->getInventorySummaryCard($filters);
        $data['crm_summary'] = $dashboardService->getCrmSummaryCard($filters);
        $data['hrm_summary'] = $dashboardService->getHrmSummaryCard($filters);
        $data['project_summary'] = $dashboardService->getProjectSummaryCard($filters);
        $data['approaching_deadline_projects'] = $dashboardService->getProjectDeadlineProjects($filters, 'approaching');
        $data['overdue_projects'] = $dashboardService->getProjectDeadlineProjects($filters, 'overdue');
        $data['receivable_ageing'] = $dashboardService->getReceivableAgeing($filters);
        $data['payable_ageing'] = $dashboardService->getPayableAgeing($filters);
        $data['top_customers'] = $dashboardService->getTopCustomers($filters);
        $data['top_suppliers'] = $dashboardService->getTopSuppliers($filters);
        $data['expense_breakdown'] = $dashboardService->getExpenseBreakdown($filters);
        $data['cashflow_chart'] = $dashboardService->getCashFlowChart($filters);

        return response()->json($data);
    }
}
