<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot\Tools;

use App\Services\AI\AiPermissionService;
use App\Services\AI\Copilot\CopilotContext;

/**
 * The one place every Copilot tool is declared.
 *
 * Replaces the inline map inside KiteLedgerCopilotAgent::tools() and the
 * parallel table in ToolAuthorizationService, so a tool's permissions, risk and
 * write status cannot drift between the two.
 */
final class CopilotToolRegistry
{
    /** @var array<string, CopilotToolDefinition>|null */
    private ?array $definitions = null;

    public function __construct(
        private readonly AiPermissionService $permissions,
    ) {}

    /** @return array<string, CopilotToolDefinition> */
    public function all(): array
    {
        return $this->definitions ??= $this->build();
    }

    public function find(string $name): ?CopilotToolDefinition
    {
        return $this->all()[$name] ?? null;
    }

    /**
     * Tools the model may be shown for this context.
     *
     * `$only` narrows the result to the tools relevant to the current routing
     * decision (see CopilotToolScope). It can only subtract from the
     * permission-filtered set, never add to it, so it is safe for a caller to
     * pass a list derived from model classification. A narrowing that would
     * leave no tools at all is ignored for non-empty scopes, because an agent
     * with no tools would answer a data question from the model's own memory —
     * exactly the failure mode the narrowing exists to reduce.
     *
     * @param  string[]|null  $only  registry tool names, or null for no narrowing
     * @return array<string, CopilotToolDefinition>
     */
    public function visibleFor(CopilotContext $context, ?array $only = null): array
    {
        $permitted = array_filter(
            $this->all(),
            fn (CopilotToolDefinition $tool) => $tool->isEnabled() && $this->authorizes($context, $tool),
        );

        if ($only === null) {
            return $permitted;
        }

        // An explicitly empty scope means "this turn needs no tools" (a
        // greeting, a refusal) and is honoured as given.
        if ($only === []) {
            return [];
        }

        $narrowed = array_intersect_key($permitted, array_flip($only));

        return $narrowed !== [] ? $narrowed : $permitted;
    }

    /**
     * Authorization check. Called both for visibility and again by the executor
     * immediately before a tool runs, because permissions can change between
     * the prompt being built and the tool being invoked.
     */
    public function authorizes(CopilotContext $context, CopilotToolDefinition $tool): bool
    {
        $user = $context->user;

        if ($this->permissions->has($user, 'ai.manage')) {
            return true;
        }

        // Both gates must pass: permission to use the AI capability, and
        // permission over the underlying business data.
        $aiOk = $tool->requiredAiPermissions === []
            || $this->permissions->hasAny($user, $tool->requiredAiPermissions);

        $domainOk = $tool->requiredDomainPermissions === []
            || $this->permissions->hasAny($user, $tool->requiredDomainPermissions);

        return $aiOk && $domainOk;
    }

    /** @return array<string, CopilotToolDefinition> */
    private function build(): array
    {
        $definitions = [
            new CopilotToolDefinition(
                name: 'financial_metrics.query',
                description: 'Compute a canonical financial or operational metric with deterministic business services.',
                handler: \App\Neuron\Agents\Tools\QueryFinancialMetricTool::class,
                requiredAiPermissions: ['ai.financial_queries', 'ai.records.search', 'ai.search'],
                requiredDomainPermissions: [
                    'reports.financial.view', 'inventory.report.view',
                    'crm.leads.view', 'crm.lead.view', 'crm.deals.view', 'crm.deal.view',
                    'crm.view', 'crm.manage', 'crm.*',
                    'project.project.view', 'project.task.view', 'project.view', 'project.*',
                ],
                readOnly: true,
                riskLevel: 'low',
                requiresApproval: false,
                cacheable: true,
                timeoutSeconds: 20,
                sourceType: 'live_database',
            ),
            new CopilotToolDefinition(
                name: 'records.search',
                description: 'Find business records by reference, name or attributes.',
                handler: \App\Neuron\Agents\Tools\SearchBusinessRecordsTool::class,
                requiredAiPermissions: ['ai.search', 'ai.records.search'],
                requiredDomainPermissions: [],
                readOnly: true,
                riskLevel: 'low',
                requiresApproval: false,
                cacheable: true,
                timeoutSeconds: 15,
                sourceType: 'live_database',
            ),
            new CopilotToolDefinition(
                name: 'reports.find',
                description: 'Find the correct KiteLedger report for a question.',
                handler: \App\Neuron\Agents\Tools\FindReportTool::class,
                requiredAiPermissions: ['ai.report_queries', 'ai.report_summary'],
                requiredDomainPermissions: ['reports.financial.view'],
                readOnly: true,
                riskLevel: 'low',
                requiresApproval: false,
                cacheable: true,
                timeoutSeconds: 10,
                sourceType: 'application_metadata',
            ),
            new CopilotToolDefinition(
                name: 'knowledge.search',
                description: 'Search KiteLedger documentation and approved company documents. Never a source for current financial figures.',
                handler: \App\Neuron\Agents\Tools\SearchKnowledgeTool::class,
                requiredAiPermissions: ['ai.search', 'ai.use'],
                requiredDomainPermissions: [],
                readOnly: true,
                riskLevel: 'low',
                requiresApproval: false,
                cacheable: true,
                timeoutSeconds: 20,
                sourceType: 'knowledge',
                featureFlag: 'ai.copilot.knowledge_tool_enabled',
            ),
            new CopilotToolDefinition(
                name: 'customers.balance',
                description: 'Outstanding balance for a named customer.',
                handler: \App\Neuron\Agents\Tools\GetCustomerBalanceTool::class,
                requiredAiPermissions: ['ai.financial_queries'],
                requiredDomainPermissions: ['reports.financial.view'],
                readOnly: true,
                riskLevel: 'low',
                requiresApproval: false,
                cacheable: true,
                timeoutSeconds: 15,
                sourceType: 'live_database',
            ),
            new CopilotToolDefinition(
                name: 'suppliers.balance',
                description: 'Outstanding balance for a named supplier.',
                handler: \App\Neuron\Agents\Tools\GetSupplierBalanceTool::class,
                requiredAiPermissions: ['ai.financial_queries'],
                requiredDomainPermissions: ['reports.financial.view'],
                readOnly: true,
                riskLevel: 'low',
                requiresApproval: false,
                cacheable: true,
                timeoutSeconds: 15,
                sourceType: 'live_database',
            ),
            new CopilotToolDefinition(
                name: 'inventory.position',
                description: 'Current inventory position and valuation.',
                handler: \App\Neuron\Agents\Tools\GetInventorySummaryTool::class,
                requiredAiPermissions: ['ai.financial_queries'],
                requiredDomainPermissions: ['inventory.report.view'],
                readOnly: true,
                riskLevel: 'low',
                requiresApproval: false,
                cacheable: true,
                timeoutSeconds: 15,
                sourceType: 'live_database',
            ),
            new CopilotToolDefinition(
                name: 'actions.propose',
                description: 'Prepare a draft record for explicit human approval. Never applies a change.',
                handler: \App\Neuron\Agents\Tools\ProposeBusinessActionTool::class,
                requiredAiPermissions: ['ai.action.propose'],
                requiredDomainPermissions: [],
                readOnly: false,
                riskLevel: 'high',
                requiresApproval: true,
                cacheable: false,
                timeoutSeconds: 20,
                sourceType: 'pending_action',
                featureFlag: 'ai.copilot.write_actions_enabled',
            ),
        ];

        $keyed = [];

        foreach ($definitions as $definition) {
            $keyed[$definition->name] = $definition;
        }

        return $keyed;
    }
}
