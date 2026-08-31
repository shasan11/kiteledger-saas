<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot\Tools;

/**
 * Declarative description of one Copilot tool.
 *
 * Visibility (which tools the model is shown) and authorization (whether a call
 * may execute) are separate concerns and both derive from this definition —
 * hiding a tool is a usability measure, never the security boundary.
 */
final readonly class CopilotToolDefinition
{
    /**
     * @param string[] $requiredAiPermissions any-of: permission to use the tool at all
     * @param string[] $requiredDomainPermissions any-of: permission over the business data
     */
    public function __construct(
        public string $name,
        public string $description,
        public string $handler,
        public array $requiredAiPermissions,
        public array $requiredDomainPermissions,
        public bool $readOnly,
        public string $riskLevel,
        public bool $requiresApproval,
        public bool $cacheable,
        public int $timeoutSeconds,
        public string $sourceType,
        public string $featureFlag = '',
    ) {}

    public function isEnabled(): bool
    {
        return $this->featureFlag === '' || (bool) config($this->featureFlag, true);
    }

    public function toTraceArray(): array
    {
        return [
            'name' => $this->name,
            'read_only' => $this->readOnly,
            'risk' => $this->riskLevel,
            'requires_approval' => $this->requiresApproval,
            'source_type' => $this->sourceType,
        ];
    }
}
