<?php

declare(strict_types=1);

namespace App\Neuron\Agents\Tools;

use App\Services\AI\Copilot\CopilotContext;
use App\Services\AI\Copilot\CopilotException;
use App\Services\AI\Copilot\Metrics\CopilotMetricCatalog;
use App\Services\AI\Copilot\Metrics\MetricQuery;
use App\Services\AI\Copilot\Tools\CopilotToolExecutor;
use NeuronAI\Tools\ArrayProperty;
use NeuronAI\Tools\PropertyType;
use NeuronAI\Tools\Tool;
use NeuronAI\Tools\ToolProperty;

/**
 * Typed replacement for RunFinancialQueryTool.
 *
 * The critical difference: this tool takes a canonical metric key and typed
 * arguments, so the request is interpreted exactly once — by CopilotRouter.
 * The old tool accepted a natural-language question and ran it back through
 * AiToolRouter::classify(), meaning a single user message was classified twice
 * by two different systems that could disagree.
 *
 * The model chooses *which* metric and supplies filters. It never computes the
 * value: every figure comes from the deterministic query services.
 */
final class QueryFinancialMetricTool extends Tool
{
    public function __construct(
        private readonly CopilotContext $context,
        private readonly CopilotToolExecutor $executor,
        private readonly CopilotMetricCatalog $catalog,
    ) {
        parent::__construct(
            'query_financial_metric',
            'Calculate a verified financial metric using deterministic accounting services. '
            .'Use for every total, balance, ageing, ranking, inventory value and sales or purchase figure. '
            ."Available metrics and their operations:\n".$this->catalogHint(),
        );
    }

    private function catalogHint(): string
    {
        // Constructor-time call: the catalog is injected, so this is safe and
        // keeps the schema description in sync with the catalog automatically.
        return $this->catalog->schemaHint();
    }

    protected function properties(): array
    {
        return [
            new ToolProperty(
                'metric',
                PropertyType::STRING,
                'Canonical metric key from the list in the tool description. Do not invent keys.',
                true,
                $this->catalog->metricKeys(),
            ),
            new ToolProperty(
                'operation',
                PropertyType::STRING,
                'What to compute: summary for a single figure, rank to order by a dimension, list for rows, ageing for buckets.',
                false,
                ['summary', 'rank', 'list', 'ageing', 'by_branch', 'by_product', 'by_warehouse', 'low_stock', 'dead_stock', 'fast_moving'],
            ),
            new ToolProperty('date_from', PropertyType::STRING, 'Period start as YYYY-MM-DD.', false),
            new ToolProperty('date_to', PropertyType::STRING, 'Period end as YYYY-MM-DD.', false),
            // ArrayProperty, not ToolProperty: a bare ARRAY ToolProperty emits
            // no `items`, and Gemini rejects the whole tool declaration with
            // "parameters.properties[statuses].items: missing field".
            new ArrayProperty(
                name: 'statuses',
                description: 'Document statuses to include, e.g. outstanding, overdue, draft.',
                required: false,
                items: new ToolProperty('status', PropertyType::STRING, 'A single document status.'),
                maxItems: 10,
            ),
            new ToolProperty('group_by', PropertyType::STRING, 'Dimension to group by, e.g. customer, supplier, branch, product, warehouse.', false),
            new ToolProperty('sort_direction', PropertyType::STRING, 'asc or desc.', false, ['asc', 'desc']),
            new ToolProperty('limit', PropertyType::INTEGER, 'Maximum rows to return, up to 200.', false),
        ];
    }

    public function __invoke(
        string $metric,
        ?string $operation = null,
        ?string $date_from = null,
        ?string $date_to = null,
        ?array $statuses = null,
        ?string $group_by = null,
        ?string $sort_direction = null,
        ?int $limit = null,
    ): string {
        try {
            $query = MetricQuery::fromArray([
                'metric' => $metric,
                'operation' => $operation ?? 'summary',
                'date_from' => $date_from,
                'date_to' => $date_to,
                'statuses' => $statuses ?? [],
                'group_by' => $group_by,
                'sort_direction' => $sort_direction ?? 'desc',
                'limit' => $limit ?? 0,
            ]);

            return $this->executor->executeMetric($this->context, $query)->toJson();
        } catch (CopilotException $e) {
            // Returned rather than thrown so the agent can explain the
            // limitation to the user instead of the turn collapsing.
            return (string) json_encode([
                'verified' => false,
                'error' => $e->getErrorCode(),
                'message' => $e->getMessage(),
            ]);
        }
    }
}
