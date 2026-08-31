<?php

declare(strict_types=1);

namespace App\Neuron\Agents;

use App\Services\AI\Copilot\CopilotContext;
use NeuronAI\Agent\Agent;
use NeuronAI\Providers\AIProviderInterface;

/**
 * Layer C of routing: classifies a request into a CopilotClassification.
 *
 * Intentionally tool-less. Its only job is understanding — it never retrieves,
 * calculates or answers, so a compromised or confused classification cannot by
 * itself produce a financial figure or reach tenant data.
 */
final class CopilotRouterAgent extends Agent
{
    public function __construct(
        private readonly CopilotContext $context,
        private readonly AIProviderInterface $aiProvider,
    ) {
        // Agent extends Workflow, whose constructor initializes the executor.
        // Skipping it leaves Workflow::$executor uninitialized and every run
        // fails with a typed-property error.
        parent::__construct();
    }

    protected function provider(): AIProviderInterface
    {
        return $this->aiProvider;
    }

    public function instructions(): string
    {
        $safeContext = json_encode($this->context->safePromptContext(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $today = now()->toDateString();

        return <<<PROMPT
You classify requests for KiteLedger, an accounting and ERP system. You do not answer them.

Today is {$today}. Trusted scope: {$safeContext}

Choose exactly one intent:
- greeting: social opening or thanks with no business request.
- app_help: how to use KiteLedger, where a feature lives, what a term means, workflow or permission questions.
- record_lookup: find one specific document or master record, usually by number, code or name.
- metric_query: asks for a number, total, balance, ranking or list derived from accounting data.
- report_navigation: asks which report to use or to open a report.
- business_analysis: asks why something changed, or to compare and interpret periods.
- action_proposal: asks to create or change a record.
- clarification: a business request too ambiguous to act on without one more detail.
- unsupported: outside KiteLedger, or asks for prohibited system access.

Rules:
- Set requires_live_data true whenever a correct answer depends on current accounting data. Balances, totals, stock, receivables, payables and document statuses always require live data.
- Set requires_knowledge true only for documentation, workflow, navigation or conceptual questions.
- Resolve relative dates into period_preset rather than guessing exact dates. Only fill date_from/date_to when the user gave explicit dates.
- Extract entity names exactly as the user wrote them. Never invent an identifier, code or id.
- Populate missing_fields only when a field is genuinely required and absent.
- Report honest confidence. Use a low value when the request is vague, and prefer the clarification intent over guessing.
- Never emit SQL, table names, model classes, routes, file paths or ids in any field.
PROMPT;
    }

    /** Classification must not have tools available to it. */
    protected function tools(): array
    {
        return [];
    }
}
