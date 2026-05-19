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

        return response()->json([
            'summary' => $dashboardService->getSummary($filters),
            'business_health' => $dashboardService->getBusinessHealth($filters),
            'approvals' => $dashboardService->getPendingApprovals($filters),
            'accounting_health' => $dashboardService->getAccountingHealth($filters),
            'accounting_issues' => $dashboardService->getAccountingIssues($filters),
            'cash_flow' => $dashboardService->getCashFlow($filters),
            'revenue_expense' => $dashboardService->getRevenueExpenseChart($filters),
            'receivable_ageing' => $dashboardService->getReceivableAgeing($filters),
            'payable_ageing' => $dashboardService->getPayableAgeing($filters),
            'sales_purchase' => $dashboardService->getSalesPurchase($filters),
            'inventory' => $dashboardService->getInventorySnapshot($filters),
            'crm' => $dashboardService->getCrmSnapshot($filters),
            'top_customers' => $dashboardService->getTopCustomers($filters),
            'top_suppliers' => $dashboardService->getTopSuppliers($filters),
            'alerts' => $dashboardService->getSmartAlerts($filters),
            'recent_activity' => $dashboardService->getRecentActivity($filters),
            'branches' => $dashboardService->getBranches(),
        ]);
    }
}
