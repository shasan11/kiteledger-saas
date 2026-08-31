<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

enum CopilotResponseType: string
{
    case Chat = 'chat';
    case VerifiedToolAnswer = 'verified_tool_answer';
    case RecordLookup = 'record_lookup';
    case Report = 'report';
    case Rag = 'rag';
    case Mixed = 'mixed';
    case Clarification = 'clarification';
    case PendingAction = 'pending_action';
    case BlockedAction = 'blocked_action';
    case Error = 'error';

    /**
     * The `mode` value the existing React assistant already understands.
     *
     * V2 introduces finer-grained types, but the frontend contract predates
     * them, so richer detail is surfaced additively via `answer_type` and
     * `evidence` while `mode` stays backward compatible.
     */
    public function legacyMode(): string
    {
        return match ($this) {
            self::PendingAction => 'pending_action',
            self::Report => 'report',
            self::VerifiedToolAnswer, self::RecordLookup => 'tool_query',
            self::Rag, self::Mixed => 'rag',
            default => 'chat',
        };
    }
}
