<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

use App\Models\AiConversation;
use App\Models\User;

/**
 * Immutable, fully-trusted Copilot request.
 *
 * Everything security-relevant here is server-derived: the user comes from the
 * authenticated session and all scope lives inside CopilotContext. The only
 * client-supplied values are the message text and a whitelisted context payload
 * that has already been stripped of identifiers upstream.
 */
final readonly class CopilotRequest
{
    /**
     * @param array<string, mixed> $safeContextPayload
     */
    public function __construct(
        public User $user,
        public string $message,
        public ?AiConversation $conversation,
        public CopilotContext $context,
        public string $contextType,
        public array $safeContextPayload,
        public bool $allowCache,
        public string $requestId,
    ) {}

    public function withConversation(AiConversation $conversation): self
    {
        return new self(
            user: $this->user,
            message: $this->message,
            conversation: $conversation,
            context: $this->context,
            contextType: $this->contextType,
            safeContextPayload: $this->safeContextPayload,
            allowCache: $this->allowCache,
            requestId: $this->requestId,
        );
    }

    public function isPrivate(): bool
    {
        return (bool) ($this->safeContextPayload['private'] ?? false);
    }

    public function hasPermission(string $permission): bool
    {
        return $this->context->hasPermission($permission);
    }
}
