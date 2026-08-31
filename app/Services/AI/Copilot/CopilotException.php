<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

use RuntimeException;
use Throwable;

/**
 * Copilot failures with a stable public error code.
 *
 * The message is user-facing and must stay free of provider names, model names,
 * identifiers, SQL and stack detail. Diagnostic information belongs in the
 * trace, which only debug-permitted users can see.
 */
class CopilotException extends RuntimeException
{
    public const AI_DISABLED = 'AI_DISABLED';
    public const AI_COPILOT_DISABLED = 'AI_COPILOT_DISABLED';
    public const AI_PROVIDER_NOT_CONFIGURED = 'AI_PROVIDER_NOT_CONFIGURED';
    public const AI_PROVIDER_AUTH_FAILED = 'AI_PROVIDER_AUTH_FAILED';
    public const AI_RATE_LIMIT = 'AI_RATE_LIMIT';
    public const AI_TIMEOUT = 'AI_TIMEOUT';
    public const AI_ROUTING_FAILED = 'AI_ROUTING_FAILED';
    public const AI_TOOL_NOT_AUTHORIZED = 'AI_TOOL_NOT_AUTHORIZED';
    public const AI_TOOL_VALIDATION_FAILED = 'AI_TOOL_VALIDATION_FAILED';
    public const AI_TOOL_EXECUTION_FAILED = 'AI_TOOL_EXECUTION_FAILED';
    public const AI_RETRIEVAL_UNAVAILABLE = 'AI_RETRIEVAL_UNAVAILABLE';
    public const AI_INSUFFICIENT_EVIDENCE = 'AI_INSUFFICIENT_EVIDENCE';
    public const AI_CLARIFICATION_REQUIRED = 'AI_CLARIFICATION_REQUIRED';
    public const AI_ACTION_DISABLED = 'AI_ACTION_DISABLED';
    public const AI_ACTION_EXPIRED = 'AI_ACTION_EXPIRED';
    public const AI_CONFIRMATION_REQUIRED = 'AI_CONFIRMATION_REQUIRED';
    public const AI_SCOPE_CHANGED = 'AI_SCOPE_CHANGED';
    public const AI_PERMISSION_DENIED = 'AI_PERMISSION_DENIED';

    /** HTTP status per code, so the controller does not re-derive it. */
    private const STATUS = [
        self::AI_DISABLED => 422,
        self::AI_COPILOT_DISABLED => 422,
        self::AI_PROVIDER_NOT_CONFIGURED => 422,
        self::AI_PROVIDER_AUTH_FAILED => 422,
        self::AI_RATE_LIMIT => 429,
        self::AI_TIMEOUT => 504,
        self::AI_PERMISSION_DENIED => 403,
        self::AI_TOOL_NOT_AUTHORIZED => 403,
        self::AI_CLARIFICATION_REQUIRED => 200,
        self::AI_CONFIRMATION_REQUIRED => 422,
    ];

    public function __construct(
        string $message,
        private readonly string $errorCode = self::AI_ROUTING_FAILED,
        private readonly ?string $traceId = null,
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    public function getTraceId(): ?string
    {
        return $this->traceId;
    }

    public function httpStatus(): int
    {
        return self::STATUS[$this->errorCode] ?? 500;
    }
}
