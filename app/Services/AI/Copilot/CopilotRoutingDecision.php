<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

/**
 * The authoritative, server-validated routing result.
 *
 * Distinct from CopilotClassification: that is what the model proposed, this is
 * what the server decided after applying safety rules, permission filtering and
 * confidence thresholds. Only this object influences execution.
 */
final readonly class CopilotRoutingDecision
{
    /**
     * @param string[] $candidateTools
     * @param string[] $entities
     * @param array<string, mixed> $filters
     * @param string[] $missingFields
     */
    public function __construct(
        public CopilotIntent $intent,
        public float $confidence,
        public bool $requiresLiveData,
        public bool $requiresKnowledge,
        public array $candidateTools,
        public array $entities,
        public array $filters,
        public array $missingFields,
        public ?string $reason,
        public string $decidedBy,
        public AnswerSourcePolicy $sourcePolicy,
        public ?string $blockedReason = null,
    ) {}

    public static function blocked(string $reason, string $decidedBy = 'safety_rules'): self
    {
        return new self(
            intent: CopilotIntent::Unsupported,
            confidence: 1.0,
            requiresLiveData: false,
            requiresKnowledge: false,
            candidateTools: [],
            entities: [],
            filters: [],
            missingFields: [],
            reason: $reason,
            decidedBy: $decidedBy,
            sourcePolicy: AnswerSourcePolicy::GeneralModelAllowed,
            blockedReason: $reason,
        );
    }

    /**
     * @param string[] $missingFields
     */
    public static function clarification(array $missingFields, string $reason, string $decidedBy, float $confidence = 0.0): self
    {
        return new self(
            intent: CopilotIntent::Clarification,
            confidence: $confidence,
            requiresLiveData: false,
            requiresKnowledge: false,
            candidateTools: [],
            entities: [],
            filters: [],
            missingFields: $missingFields,
            reason: $reason,
            decidedBy: $decidedBy,
            sourcePolicy: AnswerSourcePolicy::GeneralModelAllowed,
        );
    }

    public function isBlocked(): bool
    {
        return $this->blockedReason !== null;
    }

    public function needsClarification(): bool
    {
        return $this->intent === CopilotIntent::Clarification || $this->missingFields !== [];
    }

    /** Trace-safe representation. Contains no identifiers or raw model output. */
    public function toTraceArray(): array
    {
        return [
            'intent' => $this->intent->value,
            'confidence' => round($this->confidence, 3),
            'requires_live_data' => $this->requiresLiveData,
            'requires_knowledge' => $this->requiresKnowledge,
            'candidate_tools' => $this->candidateTools,
            'entity_count' => count($this->entities),
            'filters' => array_keys($this->filters),
            'missing_fields' => $this->missingFields,
            'decided_by' => $this->decidedBy,
            'source_policy' => $this->sourcePolicy->value,
            'blocked' => $this->isBlocked(),
            'reason' => $this->reason,
        ];
    }
}
