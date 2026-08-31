<?php

declare(strict_types=1);

namespace App\Neuron\Agents\Tools;

use App\Services\AI\Copilot\CopilotContext;
use App\Services\AI\Tools\Queries\InventoryQueryTool;
use NeuronAI\Tools\PropertyType;
use NeuronAI\Tools\Tool;
use NeuronAI\Tools\ToolProperty;

final class GetInventorySummaryTool extends Tool
{
    public function __construct(private CopilotContext $context, private InventoryQueryTool $tool)
    {
        parent::__construct('get_inventory_summary', 'Return verified inventory value, low-stock, or negative-stock results.');
    }

    protected function properties(): array
    {
        return [new ToolProperty('metric', PropertyType::STRING, 'Inventory metric.', true, ['value', 'low_stock', 'negative_stock'])];
    }

    public function __invoke(string $metric): string
    {
        $result = match ($metric) {
            'low_stock' => $this->tool->lowStock($this->context->request()),
            'negative_stock' => $this->tool->negativeStock($this->context->request()),
            default => $this->tool->inventoryValue($this->context->request()),
        };

        return json_encode(['verified' => true, 'source' => 'kiteledger_database'] + $result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
