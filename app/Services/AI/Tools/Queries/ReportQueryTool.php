<?php

namespace App\Services\AI\Tools\Queries;

use App\Services\AI\AiPermissionService;
use App\Services\AI\Tools\AiToolResult;
use App\Services\AppContextService;
use App\Services\BranchScopeService;
use App\Services\Reports\ReportRegistry;
use App\Services\Reports\ReportSoftQueryService;
use Illuminate\Http\Request;

class ReportQueryTool extends BaseQueryTool
{
    protected ReportSoftQueryService $softQuery;

    public function __construct(
        BranchScopeService $branchScope,
        AppContextService $appContext,
        AiPermissionService $permissions,
        ReportSoftQueryService $softQuery,
    ) {
        parent::__construct($branchScope, $appContext, $permissions);
        $this->softQuery = $softQuery;
    }

    public function resolve(Request $request, string $message = ''): array
    {
        $this->authorize($request, 'ai.report_summary');
        $message = $message !== '' ? $message : (string) $request->input('message', '');

        return $this->resolveWithSoftQuery($request, $message);
    }

    public function trialBalance(Request $request): array
    {
        return $this->seed($request, 'trial balance');
    }

    public function generalLedger(Request $request): array
    {
        return $this->seed($request, 'detail general ledger');
    }

    public function incomeStatement(Request $request): array
    {
        return $this->seed($request, 'income statement');
    }

    public function profitAndLoss(Request $request): array
    {
        return $this->seed($request, 'profit and loss');
    }

    public function balanceSheet(Request $request): array
    {
        return $this->seed($request, 'balance sheet');
    }

    public function cashFlow(Request $request): array
    {
        return $this->seed($request, 'cash flow summary');
    }

    public function customerReceivableSummary(Request $request): array
    {
        return $this->seed($request, 'customer receivable summary');
    }

    public function customerAgeing(Request $request): array
    {
        return $this->seed($request, 'customer ageing summary');
    }

    public function supplierPayableSummary(Request $request): array
    {
        return $this->seed($request, 'supplier payable summary');
    }

    public function supplierAgeing(Request $request): array
    {
        return $this->seed($request, 'supplier ageing summary');
    }

    public function salesSummary(Request $request): array
    {
        return $this->seed($request, 'sales summary');
    }

    public function purchaseSummary(Request $request): array
    {
        return $this->seed($request, 'purchase master');
    }

    public function inventoryPosition(Request $request): array
    {
        return $this->seed($request, 'inventory position');
    }

    public function inventoryMovement(Request $request): array
    {
        return $this->seed($request, 'inventory movement');
    }

    public function vatSummary(Request $request): array
    {
        return $this->seed($request, 'vat summary');
    }

    private function seed(Request $request, string $seedPhrase): array
    {
        $this->authorize($request, 'ai.report_summary');
        $hint = trim((string) $request->input('message', ''));
        $query = $hint === '' ? $seedPhrase : ($seedPhrase.' '.$hint);

        return $this->resolveWithSoftQuery($request, $query);
    }

    private function resolveWithSoftQuery(Request $request, string $query): array
    {
        $result = $this->softQuery->resolve($query, $request);

        if (! empty($result['matched'])) {
            $meta = ReportRegistry::resolve($result['category'], $result['report_key']);
            $user = $request->user();
            abort_unless(
                $user && $meta && ($user->can('reports.view') || $user->can($meta['permission'])),
                403,
                'You do not have permission to view this report.',
            );
        }

        if (empty($result['matched'])) {
            return AiToolResult::report(
                'unknown',
                'Report',
                [],
                '/reports'
            )->toArray() + [
                'matched' => false,
                'message' => $result['message'] ?? 'No matching report found.',
                'suggestions' => $result['suggestions'] ?? [],
            ];
        }

        return AiToolResult::report(
            str_replace('-', '_', $result['report_key']),
            $result['title'],
            $result['filters'],
            $result['open_url']
        )->toArray() + [
            'matched' => true,
            'confidence' => $result['confidence'],
            'category' => $result['category'],
            'reason' => $result['reason'] ?? null,
            'source' => 'report_soft_query',
        ];
    }
}
