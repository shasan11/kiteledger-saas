<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot\Metrics;

/**
 * A resolved metric: which deterministic service computes it, what it means,
 * and what the caller must be permitted to see.
 */
final readonly class CopilotMetricDefinition
{
    /**
     * @param string[] $requiredPermissions
     * @param string[] $supportedDimensions
     */
    public function __construct(
        public string $key,
        public string $label,
        public string $definition,
        public string $operation,
        public string $handlerClass,
        public string $handlerMethod,
        public array $requiredPermissions,
        public array $supportedDimensions,
        public bool $hasCurrency,
    ) {}

    public function supportsDimension(string $dimension): bool
    {
        return in_array($dimension, $this->supportedDimensions, true);
    }
}
