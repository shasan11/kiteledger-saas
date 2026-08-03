<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

use App\Services\AI\Copilot\Metrics\MetricQuery;

/**
 * What the orchestrator will actually do for a routed request.
 *
 * Separating the plan from execution makes the decision inspectable: the trace
 * records the plan before anything runs, so a wrong answer can be traced to the
 * wrong plan rather than guessed at from the final prose.
 */
final readonly class CopilotPlan
{
    private function __construct(
        public string $strategy,
        public ?MetricQuery $metricQuery = null,
        public ?string $tool = null,
    ) {}

    /** Execute a deterministic metric tool directly — no model in the loop. */
    public static function deterministicMetric(MetricQuery $query): self
    {
        return new self('deterministic_metric', $query, 'financial_metrics.query');
    }

    /** Hand the turn to the tool-enabled agent. */
    public static function agent(): self
    {
        return new self('agent');
    }

    /** Answer without any retrieval or tool call. */
    public static function direct(): self
    {
        return new self('direct');
    }

    public function isDeterministic(): bool
    {
        return $this->strategy === 'deterministic_metric';
    }

    public function toTraceArray(): array
    {
        return array_filter([
            'strategy' => $this->strategy,
            'tool' => $this->tool,
            'metric' => $this->metricQuery?->metric,
            'operation' => $this->metricQuery?->operation,
        ], static fn ($v) => $v !== null);
    }
}
