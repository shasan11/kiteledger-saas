<?php

declare(strict_types=1);

namespace App\Neuron\Agents\Tools;

use App\Services\AI\Copilot\CopilotContext;
use App\Services\AI\Tools\Queries\PayableQueryTool;
use NeuronAI\Tools\PropertyType;
use NeuronAI\Tools\Tool;
use NeuronAI\Tools\ToolProperty;

final class GetSupplierBalanceTool extends Tool
{
    public function __construct(private CopilotContext $context, private PayableQueryTool $tool)
    {
        parent::__construct('get_supplier_balance', 'Return verified supplier payable balances from controlled accounting queries.');
    }

    protected function properties(): array
    {
        return [new ToolProperty('supplier_reference', PropertyType::STRING, 'Supplier name or human-readable reference.', true)];
    }

    public function __invoke(string $supplier_reference): string
    {
        $result = $this->tool->supplierAgeing($this->context->request(['query' => $supplier_reference, 'supplier_reference' => $supplier_reference]));

        return json_encode(['verified' => true, 'source' => 'kiteledger_database'] + $result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
