<?php

namespace App\Http\Controllers\Api\Reports;

use App\Http\Controllers\Controller;
use App\Services\AI\AiPermissionService;
use App\Services\Reports\ReportAiSummaryService;
use App\Services\Reports\ReportRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportAiSummaryController extends Controller
{
    public function __construct(
        private readonly ReportAiSummaryService $summaries,
        private readonly AiPermissionService $permissions,
    ) {
    }

    public function summarize(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => ['required', 'string', 'max:80'],
            'report_key' => ['required', 'string', 'max:120'],
            'title' => ['nullable', 'string', 'max:200'],
            'filters' => ['nullable', 'array'],
            'columns' => ['nullable', 'array'],
            'rows' => ['nullable', 'array'],
            'totals' => ['nullable', 'array'],
            'summary_blocks' => ['nullable', 'array'],
            'summary' => ['nullable', 'array'],
            'chart_data' => ['nullable', 'array'],
            'generated_at' => ['nullable', 'string', 'max:80'],
        ]);

        $meta = ReportRegistry::resolve($validated['category'], $validated['report_key']);
        abort_unless($meta, 404);

        $this->authorizeReport($request, $meta['permission'] ?? 'reports.view');
        abort_unless($this->permissions->canSummarizeReports($request->user()), 403, 'You do not have permission to summarize reports with AI.');

        return response()->json($this->summaries->summarize($validated, $request));
    }

    private function authorizeReport(Request $request, string $permission): void
    {
        $user = $request->user();
        abort_unless($user, 401);
        abort_unless($user->can('reports.view') || $user->can($permission), 403);
    }
}
