<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

use App\Models\AiConversation;

/**
 * Structured memory for a conversation.
 *
 * Follow-ups like "compare it with last month" cannot be answered from the raw
 * message history alone — the model would have to re-derive which customer and
 * which period "it" meant, and would sometimes get it wrong. This holds the
 * resolved answer explicitly.
 *
 * Persisted in ai_conversations.metadata so no migration is required and a
 * rollback loses nothing structural.
 *
 * Only display-safe values are stored: names and references the user already
 * typed or saw. Never internal ids.
 */
final readonly class CopilotConversationState
{
    private const METADATA_KEY = 'copilot_state';

    /**
     * @param array<string, string> $entities display names keyed by role (customer, supplier, product)
     * @param array<string, mixed> $filters
     * @param array<string, mixed> $comparison
     * @param string[] $pendingClarification
     */
    public function __construct(
        public ?string $activeModule = null,
        public array $entities = [],
        public array $filters = [],
        public array $comparison = [],
        public array $pendingClarification = [],
        public ?string $lastTool = null,
        public ?string $scopeFingerprint = null,
    ) {}

    public static function empty(): self
    {
        return new self();
    }

    /**
     * Loads persisted state, discarding it when the trusted scope has changed.
     *
     * Reusing an entity resolved under a different branch or fiscal year would
     * silently answer a new question with old scope, so a scope change resets
     * rather than merges.
     */
    public static function load(AiConversation $conversation, CopilotContext $context): self
    {
        $metadata = is_array($conversation->metadata) ? $conversation->metadata : [];
        $stored = $metadata[self::METADATA_KEY] ?? null;

        if (! is_array($stored)) {
            return self::empty();
        }

        $fingerprint = self::fingerprintFor($context);

        if (($stored['scope_fingerprint'] ?? null) !== $fingerprint) {
            return self::empty();
        }

        return new self(
            activeModule: is_string($stored['active_module'] ?? null) ? $stored['active_module'] : null,
            entities: self::sanitizeEntities($stored['entities'] ?? []),
            filters: is_array($stored['filters'] ?? null) ? $stored['filters'] : [],
            comparison: is_array($stored['comparison'] ?? null) ? $stored['comparison'] : [],
            pendingClarification: array_values(array_filter((array) ($stored['pending_clarification'] ?? []), 'is_string')),
            lastTool: is_string($stored['last_tool'] ?? null) ? $stored['last_tool'] : null,
            scopeFingerprint: $fingerprint,
        );
    }

    /**
     * Fills gaps in a fresh routing decision from remembered context.
     *
     * Only ever fills gaps — anything the user restated in this turn wins, so
     * "sales for XYZ" after "sales for ABC" switches customer rather than
     * stacking both.
     */
    public function applyTo(CopilotRoutingDecision $decision): CopilotRoutingDecision
    {
        if ($decision->isBlocked() || $decision->needsClarification()) {
            return $decision;
        }

        $filters = $decision->filters;
        $entities = $decision->entities;

        // Inherit the period only when this turn named none.
        if (! isset($filters['date_range']) && isset($this->filters['date_range'])) {
            $filters['date_range'] = $this->filters['date_range'];
            $filters['inherited_date_range'] = true;
        }

        if (! isset($filters['metric']) && isset($this->filters['metric'])) {
            $filters['metric'] = $this->filters['metric'];
            $filters['inherited_metric'] = true;
        }

        if ($entities === [] && $this->entities !== []) {
            $entities = array_values($this->entities);
            $filters['inherited_entity'] = true;
        }

        if (! isset($filters['module']) && $this->activeModule !== null) {
            $filters['module'] = $this->activeModule;
        }

        return new CopilotRoutingDecision(
            intent: $decision->intent,
            confidence: $decision->confidence,
            requiresLiveData: $decision->requiresLiveData,
            requiresKnowledge: $decision->requiresKnowledge,
            candidateTools: $decision->candidateTools,
            entities: $entities,
            filters: $filters,
            missingFields: $decision->missingFields,
            reason: $decision->reason,
            decidedBy: $decision->decidedBy,
            sourcePolicy: $decision->sourcePolicy,
            blockedReason: $decision->blockedReason,
        );
    }

    /** Returns updated state after a turn. */
    public function rememberFrom(CopilotRoutingDecision $decision, CopilotContext $context, ?string $tool = null): self
    {
        if ($decision->isBlocked()) {
            return $this;
        }

        if ($decision->needsClarification()) {
            return new self(
                activeModule: $this->activeModule,
                entities: $this->entities,
                filters: $this->filters,
                comparison: $this->comparison,
                pendingClarification: $decision->missingFields,
                lastTool: $this->lastTool,
                scopeFingerprint: self::fingerprintFor($context),
            );
        }

        $entities = $this->entities;

        foreach (array_slice($decision->entities, 0, 3) as $index => $name) {
            if (is_string($name) && trim($name) !== '') {
                $entities['entity_'.$index] = mb_substr(trim($name), 0, 120);
            }
        }

        $filters = array_intersect_key($decision->filters, array_flip([
            'metric', 'module', 'date_range', 'statuses', 'group_by',
        ]));

        return new self(
            activeModule: $decision->filters['module'] ?? $this->activeModule,
            entities: $entities,
            filters: $filters !== [] ? $filters : $this->filters,
            comparison: $decision->filters['comparison_range'] ?? [],
            pendingClarification: [],
            lastTool: $tool ?? $this->lastTool,
            scopeFingerprint: self::fingerprintFor($context),
        );
    }

    public function persist(AiConversation $conversation): void
    {
        $metadata = is_array($conversation->metadata) ? $conversation->metadata : [];
        $metadata[self::METADATA_KEY] = $this->toArray();

        $conversation->forceFill(['metadata' => $metadata])->save();
    }

    public function toArray(): array
    {
        return [
            'active_module' => $this->activeModule,
            'entities' => $this->entities,
            'filters' => $this->filters,
            'comparison' => $this->comparison,
            'pending_clarification' => $this->pendingClarification,
            'last_tool' => $this->lastTool,
            'scope_fingerprint' => $this->scopeFingerprint,
        ];
    }

    /** Compact, id-free summary injected into the prompt for reference resolution. */
    public function promptSummary(): array
    {
        return array_filter([
            'active_module' => $this->activeModule,
            'known_entities' => array_values($this->entities),
            'active_period' => $this->filters['date_range']['preset'] ?? null,
            'active_metric' => $this->filters['metric'] ?? null,
            'awaiting' => $this->pendingClarification !== [] ? $this->pendingClarification : null,
        ], static fn ($v) => $v !== null && $v !== []);
    }

    public function isEmpty(): bool
    {
        return $this->activeModule === null
            && $this->entities === []
            && $this->filters === []
            && $this->pendingClarification === [];
    }

    /**
     * Ties state to user + branch + fiscal year. A change in any of them makes
     * remembered context invalid, and cross-user reuse impossible.
     */
    private static function fingerprintFor(CopilotContext $context): string
    {
        return hash('sha256', implode('|', [
            (string) $context->user->id,
            (string) $context->branchId,
            (string) $context->fiscalYearId,
            (string) $context->tenantId,
        ]));
    }

    /** @return array<string, string> */
    private static function sanitizeEntities(mixed $entities): array
    {
        if (! is_array($entities)) {
            return [];
        }

        $clean = [];

        foreach (array_slice($entities, 0, 5, true) as $key => $value) {
            if (is_string($key) && is_string($value) && trim($value) !== '') {
                // Guard against an id ever being written into state.
                if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-/i', $value)) {
                    continue;
                }

                $clean[mb_substr($key, 0, 40)] = mb_substr($value, 0, 120);
            }
        }

        return $clean;
    }
}
