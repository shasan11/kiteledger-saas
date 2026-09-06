<?php

namespace App\Http\Controllers\Api\Reports;

use App\Http\Controllers\Controller;
use App\Services\AI\AiPermissionService;
use App\Services\AI\AiProviderException;
use App\Services\Reports\Intelligence\ReportAccessDeniedException;
use App\Services\Reports\Intelligence\ReportIntelligenceService;
use App\Services\Reports\ReportRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Throwable;

/**
 * AI summary for one report.
 *
 * The request body carries only *what to summarize* — filters, and the report
 * identified by the route. It deliberately no longer accepts rows, totals,
 * summary cards or row counts: those were previously taken as financial truth,
 * which meant an edited request could change what the AI reported about the
 * company's position. The server now executes the report itself.
 */
class ReportAiSummaryController extends Controller
{
    public function __construct(
        private readonly ReportIntelligenceService $intelligence,
        private readonly AiPermissionService $permissions,
    ) {}

    public function summarize(Request $request, string $category, string $report_key): JsonResponse
    {
        if (! ReportRegistry::resolve($category, $report_key)) {
            return $this->error('Report not found.', 404);
        }

        if (! $this->permissions->canSummarizeReports($request->user())) {
            return $this->error('You do not have permission to use AI report summaries.', 403);
        }

        $validated = $request->validate([
            'filters' => ['nullable', 'array', 'max:40'],
        ]);

        try {
            return response()->json([
                'success' => true,
                'data' => $this->intelligence->summarize(
                    $request,
                    $category,
                    $report_key,
                    $validated['filters'] ?? [],
                ),
            ]);
        } catch (ReportAccessDeniedException $e) {
            // Report-level authorization, raised by the intelligence service
            // after it resolves the report's own permission. Caught before
            // AiProviderException, which also extends RuntimeException.
            return $this->error($e->getMessage(), 403);
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (AiProviderException $e) {
            return $this->providerError($e);
        } catch (Throwable $e) {
            report($e);

            return $this->error('Unable to generate summary right now. Please try again.', 503);
        }
    }

    private function providerError(AiProviderException $exception): JsonResponse
    {
        [$message, $status] = match ($exception->getErrorCode()) {
            'AI_DISABLED', 'AI_API_KEY_MISSING', 'AI_MODEL_MISSING', 'AI_PROVIDER_UNSUPPORTED' => [
                'The shared AI provider is not ready. Ask the platform administrator to check AI readiness before using report summaries.',
                422,
            ],
            'AI_RATE_LIMIT' => ['The AI provider rate limit was reached. Please try again later.', 429],
            'AI_TIMEOUT' => ['The AI provider timed out. Please try again.', 504],
            default => ['Unable to generate summary right now. Please try again.', 503],
        };

        return $this->error($message, $status);
    }

    private function error(string $message, int $status): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
        ], $status);
    }
}
