<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    private const STABLE_CACHE_TTL_MINUTES = 10;

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
            'branches' => $this->rememberStableDashboardPart('branches', $filters, fn () => $dashboardService->getBranches()),
        ];

        $data['sales_summary'] = $dashboardService->getSalesSummary($filters);
        $data['purchase_summary'] = $dashboardService->getPurchaseSummary($filters);
        $data['cashflow_summary'] = $dashboardService->getCashflowSummary($filters);
        $data['inventory_summary'] = $this->rememberStableDashboardPart('inventory-summary', $filters, fn () => $dashboardService->getInventorySummaryCard($filters));
        $data['crm_summary'] = $this->rememberStableDashboardPart('crm-summary', $filters, fn () => $dashboardService->getCrmSummaryCard($filters));
        $data['hrm_summary'] = $this->rememberStableDashboardPart('hrm-summary', $filters, fn () => $dashboardService->getHrmSummaryCard($filters));
        $data['project_summary'] = $this->rememberStableDashboardPart('project-summary', $filters, fn () => $dashboardService->getProjectSummaryCard($filters));
        $data['approaching_deadline_projects'] = $this->rememberStableDashboardPart('approaching-deadline-projects', $filters, fn () => $dashboardService->getProjectDeadlineProjects($filters, 'approaching'));
        $data['overdue_projects'] = $this->rememberStableDashboardPart('overdue-projects', $filters, fn () => $dashboardService->getProjectDeadlineProjects($filters, 'overdue'));
        $data['receivable_ageing'] = $this->rememberStableDashboardPart('receivable-ageing', $filters, fn () => $dashboardService->getReceivableAgeing($filters));
        $data['payable_ageing'] = $this->rememberStableDashboardPart('payable-ageing', $filters, fn () => $dashboardService->getPayableAgeing($filters));
        $data['top_customers'] = $this->rememberStableDashboardPart('top-customers', $filters, fn () => $dashboardService->getTopCustomers($filters));
        $data['top_suppliers'] = $this->rememberStableDashboardPart('top-suppliers', $filters, fn () => $dashboardService->getTopSuppliers($filters));
        $data['expense_breakdown'] = $this->rememberStableDashboardPart('expense-breakdown', $filters, fn () => $dashboardService->getExpenseBreakdown($filters));
        $data['cashflow_chart'] = $dashboardService->getCashFlowChart($filters);

        return response()->json($data);
    }

    private function rememberStableDashboardPart(string $part, array $filters, callable $callback): mixed
    {
        return Cache::remember(
            $this->stableDashboardCacheKey($part, $filters),
            now()->addMinutes(self::STABLE_CACHE_TTL_MINUTES),
            $callback,
        );
    }

    private function stableDashboardCacheKey(string $part, array $filters): string
    {
        $scope = [
            'tenant_id' => tenancy()->initialized && tenant() ? tenant()->getTenantKey() : null,
            'user_id' => $filters['user_id'] ?? null,
            'branch_id' => $filters['branch_id'] ?? null,
            'date_from' => $filters['date_from'] ?? null,
            'date_to' => $filters['date_to'] ?? null,
            'today' => now()->toDateString(),
        ];

        return 'dashboard:stable:v1:'.$part.':'.sha1(json_encode($scope));
    }
}
