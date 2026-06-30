<?php

namespace App\Http\Controllers\Api\Reports;

use App\Http\Controllers\Controller;
use App\Services\AI\AiPermissionService;
use App\Services\AI\AiProviderException;
use App\Services\Reports\ReportAiSummaryService;
use App\Services\Reports\ReportRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Throwable;

class ReportAiSummaryController extends Controller
{
    public function __construct(
        private readonly ReportAiSummaryService $summaries,
        private readonly AiPermissionService $permissions,
    ) {}

    public function summarize(Request $request, string $category, string $report_key): JsonResponse
    {
        $meta = ReportRegistry::resolve($category, $report_key);

        if (! $meta) {
            return $this->error('Report not found.', 404);
        }

        $this->authorizeReport($request, $meta['permission'] ?? 'reports.view');

        if (! $this->permissions->canSummarizeReports($request->user())) {
            return $this->error('You do not have permission to use AI report summaries.', 403);
        }

        $validated = $request->validate([
            'filters' => ['nullable', 'array', 'max:30'],
            'columns' => ['nullable', 'array', 'max:30'],
            'columns.*' => ['array'],
            'columns.*.key' => ['required', 'string', 'max:100'],
            'columns.*.title' => ['required', 'string', 'max:120'],
            'rows' => ['nullable', 'array', 'max:100'],
            'rows.*' => ['array'],
            'totals' => ['nullable', 'array', 'max:50'],
            'summary_cards' => ['nullable', 'array', 'max:30'],
            'summary_cards.*' => ['array'],
            'summary_cards.*.label' => ['nullable', 'string', 'max:120'],
            'summary_cards.*.title' => ['nullable', 'string', 'max:120'],
            'metadata' => ['nullable', 'array'],
            'metadata.currency' => ['nullable', 'string', 'max:20'],
            'metadata.branch' => ['nullable', 'string', 'max:120'],
            'metadata.fiscal_year' => ['nullable', 'string', 'max:120'],
            'metadata.generated_at' => ['nullable', 'string', 'max:80'],
            'metadata.row_count' => ['nullable', 'integer', 'min:0', 'max:1000000'],
        ]);

        $payload = array_merge($validated, [
            'category' => $category,
            'report_key' => $report_key,
            'report_title' => $meta['title'] ?? $report_key,
        ]);

        try {
            return response()->json([
                'success' => true,
                'data' => $this->summaries->summarize($payload, $request),
            ]);
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (AiProviderException $e) {
            return $this->providerError($e);
        } catch (Throwable $e) {
            report($e);

            return $this->error('Unable to generate summary right now. Please try again.', 503);
        }
    }

    private function authorizeReport(Request $request, string $permission): void
    {
        $user = $request->user();
        abort_unless($user, 401);
        abort_unless($user->can('reports.view') || $user->can($permission), 403);
    }

    private function providerError(AiProviderException $exception): JsonResponse
    {
        [$message, $status] = match ($exception->getErrorCode()) {
            'AI_DISABLED', 'AI_API_KEY_MISSING', 'AI_MODEL_MISSING', 'AI_PROVIDER_UNSUPPORTED' => [
                'AI provider is not configured. Please configure an AI provider before using report summaries.',
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
