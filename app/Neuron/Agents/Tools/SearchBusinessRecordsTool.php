<?php

declare(strict_types=1);

namespace App\Neuron\Agents\Tools;

use App\Services\AI\Agent\AiRecordSearchService;
use App\Services\AI\Copilot\CopilotContext;
use InvalidArgumentException;
use NeuronAI\Tools\PropertyType;
use NeuronAI\Tools\Tool;
use NeuronAI\Tools\ToolProperty;

final class SearchBusinessRecordsTool extends Tool
{
    private const MODULES = ['invoices', 'quotations', 'sales_orders', 'customer_payments', 'credit_notes', 'purchase_orders', 'purchase_bills', 'supplier_payments', 'debit_notes', 'expenses', 'journal_vouchers', 'cash_transfers', 'products', 'contacts'];

    public function __construct(private CopilotContext $context, private AiRecordSearchService $search)
    {
        parent::__construct('search_business_records', 'Search one allowlisted ERP record type using trusted tenant, branch, and fiscal-year context. Never accepts table names, SQL, tenant IDs, branch IDs, or fiscal-year IDs.');
    }

    protected function properties(): array
    {
        return [
            new ToolProperty('module', PropertyType::STRING, 'Allowlisted record type.', true, self::MODULES),
            new ToolProperty('query', PropertyType::STRING, 'Record number, name, description, or status.', true),
            new ToolProperty('limit', PropertyType::INTEGER, 'Maximum rows, from 1 to 20.', false),
        ];
    }

    public function __invoke(string $module, string $query, ?int $limit = null): string
    {
        if (! in_array($module, self::MODULES, true)) {
            throw new InvalidArgumentException('Unsupported record type.');
        }

        $result = $this->search->search($this->context->request(), $module, $query, max(1, min(20, $limit ?? 10)));

        return json_encode($result ?? ['records' => [], 'warning' => 'No authorized records matched.'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
