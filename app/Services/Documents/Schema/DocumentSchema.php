<?php

declare(strict_types=1);

namespace App\Services\Documents\Schema;

final readonly class DocumentSchema
{
    /**
     * @param string[] $requiredFields
     * @param string[] $optionalFields
     */
    public function __construct(
        public string $type,
        public string $label,
        public array $requiredFields,
        public array $optionalFields,
        public ?string $conversionTarget,
        public ?string $partyRole,
        public bool $needsLines,
    ) {}

    public function isConvertible(): bool
    {
        return $this->conversionTarget !== null;
    }

    public function requires(string $field): bool
    {
        return in_array($field, $this->requiredFields, true);
    }

    /** @return string[] all fields this type cares about */
    public function allFields(): array
    {
        return array_values(array_unique(array_merge($this->requiredFields, $this->optionalFields)));
    }
}
