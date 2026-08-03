<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot\Tools;

use App\Services\AI\AiPermissionService;
use App\Services\AI\AiUsageLogger;
use App\Services\AI\Copilot\CopilotContext;
use App\Services\AI\Copilot\CopilotException;
use App\Services\AI\Copilot\Metrics\CopilotMetricCatalog;
use App\Services\AI\Copilot\Metrics\MetricQuery;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Executes deterministic Copilot tools.
 *
 * Authorization is re-checked here, immediately before execution, and never
 * inferred from the fact that a tool was visible to the model. Results are
 * sanitized on the way out so identifiers never reach the prompt.
 */
final class CopilotToolExecutor
{
    /** Row keys that must never be handed to the model. */
    private const FORBIDDEN_ROW_KEYS = [
        'id', 'uuid', 'tenant_id', 'company_id', 'user_id', 'created_by', 'updated_by',
        'password', 'api_key', 'token', 'embedding', 'vector',
    ];

    public function __construct(
        private readonly CopilotToolRegistry $registry,
        private readonly CopilotMetricCatalog $catalog,
        private readonly AiPermissionService $permissions,
        private readonly AiUsageLogger $usage,
    ) {}

    public function executeMetric(CopilotContext $context, MetricQuery $query): CopilotToolResult
    {
        $definition = $this->registry->find('financial_metrics.query');

        if (! $definition || ! $definition->isEnabled()) {
            throw new CopilotException(
                'Financial queries are not available.',
                CopilotException::AI_TOOL_NOT_AUTHORIZED,
            );
        }

        // Gate 1: may this user use the tool at all?
        $this->assertAuthorized($context, $definition);

        $metric = $this->catalog->resolve($query->metric, $query->operation);

        // Gate 2: may this user see this specific metric's data? A user allowed
        // to run inventory queries is not thereby allowed to read receivables.
        if (! $this->permissions->has($context->user, 'ai.manage')
            && ! $this->permissions->hasAny($context->user, $metric->requiredPermissions)) {
            throw new CopilotException(
                'You do not have permission to view that figure.',
                CopilotException::AI_TOOL_NOT_AUTHORIZED,
            );
        }

        if ($query->groupBy !== null && ! $metric->supportsDimension($query->groupBy)) {
            throw new CopilotException(
                "{$metric->label} cannot be grouped by {$query->groupBy}.",
                CopilotException::AI_TOOL_VALIDATION_FAILED,
            );
        }

        $startedAt = microtime(true);

        try {
            // The Request is rebuilt from trusted context; branch and fiscal
            // year headers come from the server, never from tool arguments.
            $request = $context->request($query->toRequestInputs());

            $raw = app($metric->handlerClass)->{$metric->handlerMethod}($request);
        } catch (CopilotException $e) {
            throw $e;
        } catch (Throwable $e) {
            $this->logFailure($context, $metric->key, $e, $startedAt);

            throw new CopilotException(
                'That figure could not be calculated right now.',
                CopilotException::AI_TOOL_EXECUTION_FAILED,
                null,
                $e,
            );
        }

        $this->usage->log([
            'user_id' => $context->user->id,
            'branch_id' => $context->branchId,
            'module' => $metric->key,
            'selected_tool' => $definition->name,
            'status' => 'success',
            'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
        ]);

        return $this->toResult($definition, $metric->label, $metric->definition, $context, $query, $raw, $metric->hasCurrency);
    }

    private function assertAuthorized(CopilotContext $context, CopilotToolDefinition $definition): void
    {
        if (! $this->registry->authorizes($context, $definition)) {
            throw new CopilotException(
                'You do not have permission to use that Copilot capability.',
                CopilotException::AI_TOOL_NOT_AUTHORIZED,
            );
        }
    }

    /**
     * @param array<string, mixed> $raw output of a deterministic query service
     */
    private function toResult(
        CopilotToolDefinition $definition,
        string $label,
        string $calculation,
        CopilotContext $context,
        MetricQuery $query,
        array $raw,
        bool $hasCurrency,
    ): CopilotToolResult {
        $rows = $this->sanitizeRows($raw['records'] ?? $raw['rows'] ?? []);

        $metrics = array_filter(
            $raw['metrics'] ?? $raw['totals'] ?? [],
            static fn ($value) => is_scalar($value) || $value === null,
        );

        // A single scalar answer (a balance, a total) is still a metric.
        if ($metrics === [] && isset($raw['value']) && is_scalar($raw['value'])) {
            $metrics = ['value' => $raw['value']];
        }

        return new CopilotToolResult(
            tool: $definition->name,
            verified: true,
            dataSource: $definition->sourceType,
            rows: $rows,
            metrics: $metrics,
            appliedFilters: $query->appliedFilters(),
            currency: $hasCurrency ? $context->baseCurrency : null,
            dateFrom: $query->dateFrom,
            dateTo: $query->dateTo,
            branchScope: $context->branchId ? 'Selected branch' : 'All permitted branches',
            fiscalYearScope: $context->fiscalYearId ? 'Selected fiscal year' : 'All permitted fiscal years',
            calculationDefinition: $calculation,
            limitations: array_values(array_filter((array) ($raw['warnings'] ?? []), 'is_string')),
            asOf: now(),
            sourceLabel: $label,
            summary: is_string($raw['summary'] ?? null) ? $raw['summary'] : null,
        );
    }

    /**
     * Flattens result rows to scalars and drops identifier-bearing keys.
     *
     * @return array<int, array<string, scalar|null>>
     */
    private function sanitizeRows(mixed $records): array
    {
        if (! is_array($records)) {
            return [];
        }

        $clean = [];

        foreach (array_slice($records, 0, 100) as $row) {
            if (! is_array($row)) {
                continue;
            }

            $sanitized = [];

            foreach ($row as $key => $value) {
                $key = (string) $key;
                $lower = strtolower($key);

                if (in_array($lower, self::FORBIDDEN_ROW_KEYS, true) || str_ends_with($lower, '_id')) {
                    continue;
                }

                if (is_scalar($value) || $value === null) {
                    $sanitized[$key] = is_string($value) ? mb_substr($value, 0, 300) : $value;
                }
            }

            if ($sanitized !== []) {
                $clean[] = $sanitized;
            }
        }

        return $clean;
    }

    private function logFailure(CopilotContext $context, string $metric, Throwable $e, float $startedAt): void
    {
        // Operational AI failures are logged, never silently swallowed.
        Log::warning('Copilot metric execution failed', [
            'metric' => $metric,
            'error' => $e->getMessage(),
        ]);

        $this->usage->log([
            'user_id' => $context->user->id,
            'module' => $metric,
            'status' => 'error',
            'error_message' => mb_substr($e->getMessage(), 0, 300),
            'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
        ]);
    }
}
