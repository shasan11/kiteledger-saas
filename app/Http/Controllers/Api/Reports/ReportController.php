<?php

namespace App\Http\Controllers\Api\Reports;

use App\Http\Controllers\Controller;
use App\Services\Reports\AccountingReportService;
use App\Services\Reports\AnalyticsReportService;
use App\Services\Reports\HrReportService;
use App\Services\Reports\InventoryReportService;
use App\Services\Reports\PayableReportService;
use App\Services\Reports\ProductionReportService;
use App\Services\Reports\PurchaseReportService;
use App\Services\Reports\ReceivableReportService;
use App\Services\Reports\ReportExportService;
use App\Services\Reports\ReportFilterService;
use App\Services\Reports\ReportRegistry;
use App\Services\Reports\SalesReportService;
use App\Services\Reports\SystemReportService;
use App\Services\Reports\TaxReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(
        protected readonly ReportFilterService $filters,
        protected readonly ReportExportService $exportService,
        protected readonly AccountingReportService $accounting,
        protected readonly ReceivableReportService $receivable,
        protected readonly PayableReportService $payable,
        protected readonly SalesReportService $sales,
        protected readonly PurchaseReportService $purchase,
        protected readonly TaxReportService $tax,
        protected readonly InventoryReportService $inventory,
        protected readonly ProductionReportService $production,
        protected readonly HrReportService $hr,
        protected readonly SystemReportService $system,
        protected readonly AnalyticsReportService $analytics,
    ) {}

    public function index(Request $request, string $category, string $report_key): JsonResponse
    {
        $meta = ReportRegistry::resolve($category, $report_key);
        abort_unless($meta, 404);
        $this->authorizePermission($request, $meta['permission']);

        try {
            $data = $this->serviceFor($category)->build($report_key, $this->filters->normalize($request), $meta);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'title' => $meta['title'] ?? 'Report',
                'report_key' => $report_key,
                'category' => $meta['category_label'] ?? $category,
                'rows' => [],
                'columns' => [],
                'summary' => [],
                'totals' => [],
                'generated_at' => now()->format('Y-m-d H:i:s'),
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred while generating this report.',
            ], 500);
        }

        return response()->json($data);
    }

    public function export(Request $request, string $category, string $report_key)
    {
        $meta = ReportRegistry::resolve($category, $report_key);
        abort_unless($meta, 404);
        $this->authorizePermission($request, $meta['permission']);
        $this->authorizeExport($request);

        try {
            $report = $this->serviceFor($category)->build($report_key, $this->filters->normalize($request), $meta);

            return $this->exportService->export($report, $request->query('format', 'csv'));
        } catch (\Throwable $e) {
            report($e);
            abort(500, config('app.debug') ? $e->getMessage() : 'Export failed.');
        }
    }

    protected function authorizePermission(Request $request, string $permission): void
    {
        $user = $request->user();
        abort_unless($user, 401);
        abort_unless($user->can('reports.view') || $user->can($permission), 403);
    }

    protected function authorizeExport(Request $request): void
    {
        $user = $request->user();
        abort_unless($user, 401);
        abort_unless($user->can('reports.export'), 403);
    }

    protected function serviceFor(string $category): mixed
    {
        return match ($category) {
            'accounting' => $this->accounting,
            'receivable' => $this->receivable,
            'payable' => $this->payable,
            'sales' => $this->sales,
            'purchase' => $this->purchase,
            'tax' => $this->tax,
            'inventory' => $this->inventory,
            'production' => $this->production,
            'hr' => $this->hr,
            'system' => $this->system,
            'analytics' => $this->analytics,
            default => abort(404),
        };
    }
}
