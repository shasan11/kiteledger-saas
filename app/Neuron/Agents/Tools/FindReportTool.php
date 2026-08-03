<?php

declare(strict_types=1);

namespace App\Neuron\Agents\Tools;

use App\Services\AI\Agent\AiReportResolver;
use App\Services\AI\Copilot\CopilotContext;
use NeuronAI\Tools\PropertyType;
use NeuronAI\Tools\Tool;
use NeuronAI\Tools\ToolProperty;

final class FindReportTool extends Tool
{
    public function __construct(private CopilotContext $context, private AiReportResolver $reports)
    {
        parent::__construct('find_report', 'Find an authorized KiteLedger report and its application route.');
    }

    protected function properties(): array
    {
        return [new ToolProperty('query', PropertyType::STRING, 'Report name or business purpose.', true)];
    }

    public function __invoke(string $query): string
    {
        return json_encode($this->reports->resolve($this->context->request(), $query), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
