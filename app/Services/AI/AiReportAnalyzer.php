<?php

namespace App\Services\AI;

use App\Services\Reports\AccountingReportService;
use App\Services\Reports\AnalyticsReportService;
use App\Services\Reports\InventoryReportService;
use App\Services\Reports\PayableReportService;
use App\Services\Reports\PurchaseReportService;
use App\Services\Reports\ReceivableReportService;
use App\Services\Reports\ReportFilterService;
use App\Services\Reports\ReportRegistry;
use App\Services\Reports\SalesReportService;
use App\Services\Reports\TaxReportService;
use Illuminate\Http\Request;
use Throwable;

class AiReportAnalyzer
{
    public function __construct(
        protected AiProviderService       $provider,
        protected ReportFilterService     $filters,
        protected AccountingReportService $accounting,
        protected ReceivableReportService $receivable,
        protected PayableReportService    $payable,
        protected SalesReportService      $sales,
        protected PurchaseReportService   $purchase,
        protected TaxReportService        $tax,
        protected InventoryReportService  $inventory,
        protected AnalyticsReportService  $analytics,
    ) {}

    public function ask(string $question, string $category, string $reportKey, array $rawFilters = []): array
    {
        try {
            $meta = ReportRegistry::resolve($category, $reportKey);
        } catch (Throwable $e) {
            return $this->errorResponse('Unknown report: ' . $category . '/' . $reportKey);
        }

        $request = Request::create('/internal/ai/report', 'POST', $rawFilters);
        $filters = $this->filters->normalize($request);

        try {
            $data = $this->serviceFor($category)?->build($reportKey, $filters, $meta) ?? [];
        } catch (Throwable $e) {
            return $this->errorResponse('Failed to build report: ' . $e->getMessage());
        }

        // Reduce data to a compact summary the LLM can reason about
        $compact = $this->compact($data);

        $sys = 'You are a senior accountant. Answer business questions using only the provided report data. '
            . 'Never invent numbers. If the data does not answer the question, say so.';

        $usr = "Question: {$question}\n"
            . "Report: {$category}/{$reportKey}\n"
            . "Filters: " . json_encode($filters) . "\n"
            . "Report data (compact JSON): " . json_encode($compact) . "\n\n"
            . "Return JSON with keys: answer (string, plain English, 2-4 sentences), "
            . "key_numbers (array of {label, value}), drivers (array of short strings — what drove the result), "
            . "recommendations (array of short action items).";

        try {
            $result = $this->provider->structured(
                module: 'report_explainer',
                systemPrompt: $sys,
                userPrompt: $usr,
            );
            $payload = $result['data'] ?? [];
        } catch (Throwable $e) {
            return $this->errorResponse('AI provider error: ' . $e->getMessage());
        }

        return [
            'answer'          => $payload['answer']          ?? '',
            'key_numbers'     => $payload['key_numbers']     ?? [],
            'drivers'         => $payload['drivers']         ?? [],
            'recommendations' => $payload['recommendations'] ?? [],
            'sources'         => [[
                'category'   => $category,
                'report_key' => $reportKey,
                'filters'    => $filters,
            ]],
        ];
    }

    private function serviceFor(string $category): mixed
    {
        return match ($category) {
            'accounting' => $this->accounting,
            'receivable' => $this->receivable,
            'payable'    => $this->payable,
            'sales'      => $this->sales,
            'purchase'   => $this->purchase,
            'tax'        => $this->tax,
            'inventory'  => $this->inventory,
            'analytics'  => $this->analytics,
            default      => null,
        };
    }

    private function compact(array $data, int $maxItems = 50): array
    {
        // Truncate large arrays to avoid blowing the prompt
        $walker = function ($v) use (&$walker, $maxItems) {
            if (is_array($v)) {
                if (array_is_list($v) && count($v) > $maxItems) {
                    $v = array_slice($v, 0, $maxItems);
                    $v[] = ['_truncated' => true];
                }
                foreach ($v as $k => $vv) {
                    $v[$k] = $walker($vv);
                }
            }
            return $v;
        };
        return $walker($data);
    }

    private function errorResponse(string $msg): array
    {
        return [
            'answer'          => $msg,
            'key_numbers'     => [],
            'drivers'         => [],
            'recommendations' => [],
            'sources'         => [],
        ];
    }
}
