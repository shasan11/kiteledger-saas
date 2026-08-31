<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

/**
 * The single vocabulary of Copilot request intents.
 *
 * Replaces the loose string/array intents previously produced independently by
 * AiToolRouter::classify(), AiAgentIntentService and AiQueryUnderstandingService.
 */
enum CopilotIntent: string
{
    case Greeting = 'greeting';
    case AppHelp = 'app_help';
    case RecordLookup = 'record_lookup';
    case MetricQuery = 'metric_query';
    case ReportNavigation = 'report_navigation';
    case BusinessAnalysis = 'business_analysis';
    case ActionProposal = 'action_proposal';
    case Clarification = 'clarification';
    case Unsupported = 'unsupported';

    /**
     * Whether an answer for this intent must be backed by a deterministic tool
     * result. Retrieved knowledge chunks are never sufficient for these.
     */
    public function requiresLiveData(): bool
    {
        return match ($this) {
            self::MetricQuery, self::RecordLookup, self::BusinessAnalysis => true,
            default => false,
        };
    }

    public function sourcePolicy(): AnswerSourcePolicy
    {
        return match ($this) {
            self::MetricQuery, self::RecordLookup => AnswerSourcePolicy::LiveToolRequired,
            self::BusinessAnalysis => AnswerSourcePolicy::MixedEvidence,
            self::AppHelp, self::ReportNavigation => AnswerSourcePolicy::KnowledgeRetrievalAllowed,
            default => AnswerSourcePolicy::GeneralModelAllowed,
        };
    }

    public static function tryFromLabel(?string $value): self
    {
        return self::tryFrom(strtolower(trim((string) $value))) ?? self::Unsupported;
    }
}
