<?php

declare(strict_types=1);

namespace App\Neuron\Agents\Tools;

use App\Services\AI\Copilot\CopilotContext;
use App\Services\AI\Tools\Queries\ReceivableQueryTool;
use NeuronAI\Tools\PropertyType;
use NeuronAI\Tools\Tool;
use NeuronAI\Tools\ToolProperty;

final class GetCustomerBalanceTool extends Tool
{
    public function __construct(private CopilotContext $context, private ReceivableQueryTool $tool)
    {
        parent::__construct('get_customer_balance', 'Return verified customer receivable balances from controlled accounting queries.');
    }

    protected function properties(): array
    {
        return [new ToolProperty('customer_reference', PropertyType::STRING, 'Customer name or human-readable reference.', true)];
    }

    public function __invoke(string $customer_reference): string
    {
        $result = $this->tool->customerAgeing($this->context->request(['query' => $customer_reference, 'customer_reference' => $customer_reference]));

        return json_encode(['verified' => true, 'source' => 'kiteledger_database'] + $result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
