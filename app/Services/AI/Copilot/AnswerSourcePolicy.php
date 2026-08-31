<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

/**
 * Governs which evidence may ground an answer.
 *
 * This is the enforcement point for the rule that indexed knowledge chunks must
 * never be presented as a current financial figure — a stale embedding of last
 * quarter's invoice is not an authoritative receivable balance.
 */
enum AnswerSourcePolicy: string
{
    case LiveToolRequired = 'live_tool_required';
    case KnowledgeRetrievalAllowed = 'knowledge_retrieval_allowed';
    case MixedEvidence = 'mixed_evidence';
    case GeneralModelAllowed = 'general_model_allowed';

    public function allowsKnowledgeRetrieval(): bool
    {
        return $this !== self::LiveToolRequired;
    }

    public function requiresVerifiedTool(): bool
    {
        return $this === self::LiveToolRequired;
    }

    /** Badge shown to the user so live and documentation answers are distinguishable. */
    public function evidenceLabel(): string
    {
        return match ($this) {
            self::LiveToolRequired => 'Verified live data',
            self::KnowledgeRetrievalAllowed => 'KiteLedger documentation',
            self::MixedEvidence => 'Live data + documentation',
            self::GeneralModelAllowed => 'General guidance',
        };
    }
}
