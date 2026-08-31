<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

use App\Models\AiConversation;

/**
 * What the orchestrator hands back: the answer, the trace that explains how it
 * was produced, and the conversation it belongs to.
 *
 * Kept separate from CopilotResponse so the trace never leaks into the HTTP
 * envelope by accident — the controller has to ask for it explicitly, and only
 * attaches it for users holding the AI debug permission.
 */
final readonly class CopilotOutcome
{
    public function __construct(
        public CopilotResponse $response,
        public CopilotTrace $trace,
        public AiConversation $conversation,
        public ?CopilotException $exception = null,
    ) {}

    public function failed(): bool
    {
        return $this->exception !== null;
    }

    public function httpStatus(): int
    {
        return $this->exception?->httpStatus() ?? 200;
    }
}
