<?php

declare(strict_types=1);

namespace App\Neuron\Agents\Tools;

use App\Services\AI\Copilot\CopilotContext;
use App\Services\AI\Tools\AiToolRouter;
use Illuminate\Validation\ValidationException;
use NeuronAI\Tools\PropertyType;
use NeuronAI\Tools\Tool;
use NeuronAI\Tools\ToolProperty;

final class RunFinancialQueryTool extends Tool
{
    public function __construct(private CopilotContext $context, private AiToolRouter $router)
    {
        parent::__construct('run_financial_query', 'Calculate a supported financial metric with deterministic PHP/database services. Use this for all totals, balances, ageing, tax, inventory value, sales, expense, profit/loss, and exact transaction values.');
    }

    protected function properties(): array
    {
        return [
            new ToolProperty('question', PropertyType::STRING, 'The financial question. SQL and table names are prohibited.', true),
            new ToolProperty('date_from', PropertyType::STRING, 'Optional ISO date.', false),
            new ToolProperty('date_to', PropertyType::STRING, 'Optional ISO date.', false),
        ];
    }

    public function __invoke(string $question, ?string $date_from = null, ?string $date_to = null): string
    {
        if (preg_match('/\b(select|insert|update|delete|drop|alter|truncate)\b|--|\/\*/i', $question)) {
            throw ValidationException::withMessages(['question' => 'Arbitrary SQL is prohibited.']);
        }

        $classification = $this->router->classify($question);
        if (($classification['type'] ?? null) !== 'query') {
            throw ValidationException::withMessages(['question' => 'No supported deterministic financial operation matched.']);
        }

        $request = $this->context->request(array_filter(['from_date' => $date_from, 'to_date' => $date_to]));
        $result = $this->router->runQuery($request, $classification);
        $result['verified'] = true;
        $result['source'] = 'kiteledger_database';

        return json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
