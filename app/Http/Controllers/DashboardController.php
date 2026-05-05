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
            'approvals' => $dashboardService->getPendingApprovals($filters),
            'accounting_health' => $dashboardService->getAccountingHealth($filters),
            'accounting_issues' => $dashboardService->getAccountingIssues($filters),
            'cash_flow' => $dashboardService->getCashFlow($filters),
            'sales_purchase' => $dashboardService->getSalesPurchase($filters),
            'inventory' => $dashboardService->getInventorySnapshot($filters),
            'crm' => $dashboardService->getCrmSnapshot($filters),
            'alerts' => $dashboardService->getSmartAlerts($filters),
            'recent_activity' => $dashboardService->getRecentActivity($filters),
            'branches' => $dashboardService->getBranches(),
        ]);
    }
}
