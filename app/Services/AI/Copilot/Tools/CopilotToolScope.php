<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot\Tools;

use App\Services\AI\Copilot\CopilotIntent;
use App\Services\AI\Copilot\CopilotRoutingDecision;

/**
 * Narrows the toolset a single Copilot turn may see.
 *
 * Exposing the whole authorized registry to every request is the main cause of
 * wrong tool selection, wasted prompt tokens and extra round trips: a question
 * about overdue receivables has no reason to be shown inventory or
 * document-scanning tools. The routing decision already states which category
 * of work the turn needs, so that decision — not the permission set — is what
 * determines visibility.
 *
 * This is a usability and latency control, never a security control. Every tool
 * still re-authorizes when it executes, and narrowing can only ever remove
 * tools from the already permission-filtered set.
 */
final class CopilotToolScope
{
    /**
     * Tools relevant to each intent, in registry names.
     *
     * An intent absent from this map (or one whose entries are all
     * unauthorized) falls back to the full permitted set rather than leaving
     * the agent with nothing to answer from.
     *
     * @var array<string, string[]>
     */
    private const INTENT_TOOLS = [
        CopilotIntent::MetricQuery->value => [
            'financial_metrics.query',
            'customers.balance',
            'suppliers.balance',
            'inventory.position',
        ],
        CopilotIntent::RecordLookup->value => [
            'records.search',
            'financial_metrics.query',
        ],
        CopilotIntent::ReportNavigation->value => [
            'reports.find',
        ],
        CopilotIntent::AppHelp->value => [
            'knowledge.search',
            'reports.find',
        ],
        CopilotIntent::BusinessAnalysis->value => [
            'financial_metrics.query',
            'customers.balance',
            'suppliers.balance',
            'inventory.position',
            'knowledge.search',
        ],
        CopilotIntent::ActionProposal->value => [
            'actions.propose',
            'records.search',
        ],
        // A greeting needs no tools at all; sending the registry with it is
        // pure token cost and invites a spurious tool call.
        CopilotIntent::Greeting->value => [],
        CopilotIntent::Clarification->value => [],
        CopilotIntent::Unsupported->value => [],
    ];

    /**
     * Registry tool names this turn may use, or null for "no restriction".
     *
     * Null is returned only when the intent has no declared scope, so a new
     * intent added later degrades to today's behaviour instead of silently
     * losing every tool.
     *
     * @return string[]|null
     */
    public function resolve(CopilotRoutingDecision $decision): ?array
    {
        if (! array_key_exists($decision->intent->value, self::INTENT_TOOLS)) {
            return null;
        }

        $scoped = self::INTENT_TOOLS[$decision->intent->value];

        // The router's own candidate list narrows further when it names tools
        // the registry actually knows; unknown names are ignored rather than
        // trusted, since they originate from a model classification.
        $candidates = array_values(array_intersect($decision->candidateTools, $scoped));

        return $candidates !== [] ? $candidates : $scoped;
    }
}
