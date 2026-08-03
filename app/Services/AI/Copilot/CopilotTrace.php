<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

/**
 * Per-request execution trace.
 *
 * Deliberately application-owned rather than delegated entirely to an external
 * observability service: when an accounting answer is disputed, the routing and
 * tool decisions behind it have to be explainable from within the product.
 *
 * Nothing recorded here may contain secrets, vectors, raw prompts, identifiers
 * or complete records — only decisions, counts, durations and outcomes.
 */
final class CopilotTrace
{
    private float $startedAt;

    /** @var array<int, array<string, mixed>> */
    private array $steps = [];

    /** @var array<string, mixed> */
    private array $attributes = [];

    private ?string $errorCode = null;

    private ?string $fallbackReason = null;

    public function __construct(
        public readonly string $requestId,
    ) {
        $this->startedAt = microtime(true);
    }

    public function attribute(string $key, mixed $value): self
    {
        $this->attributes[$key] = $value;

        return $this;
    }

    public function step(string $name, array $data = [], ?float $startedAt = null): self
    {
        $this->steps[] = [
            'step' => $name,
            'data' => $data,
            'duration_ms' => $startedAt !== null
                ? (int) round((microtime(true) - $startedAt) * 1000)
                : null,
            'at_ms' => (int) round((microtime(true) - $this->startedAt) * 1000),
        ];

        return $this;
    }

    public function routing(CopilotRoutingDecision $decision): self
    {
        return $this->step('routing', $decision->toTraceArray());
    }

    public function fallback(string $reason): self
    {
        $this->fallbackReason = $reason;

        return $this->step('fallback', ['reason' => $reason]);
    }

    public function error(string $code, ?string $safeMessage = null): self
    {
        $this->errorCode = $code;

        return $this->step('error', array_filter([
            'code' => $code,
            'message' => $safeMessage,
        ]));
    }

    public function durationMs(): int
    {
        return (int) round((microtime(true) - $this->startedAt) * 1000);
    }

    public function errorCode(): ?string
    {
        return $this->errorCode;
    }

    /**
     * Sanitized trace, exposed only to users holding the AI debug permission.
     */
    public function toArray(): array
    {
        return [
            'request_id' => $this->requestId,
            'duration_ms' => $this->durationMs(),
            'error_code' => $this->errorCode,
            'fallback_reason' => $this->fallbackReason,
            'attributes' => $this->attributes,
            'steps' => $this->steps,
        ];
    }
}
