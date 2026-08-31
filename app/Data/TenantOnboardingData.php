<?php

namespace App\Data;

final readonly class TenantOnboardingData
{
    public function __construct(public array $attributes) {}

    public static function from(array $attributes): self
    {
        return new self($attributes);
    }

    public function toArray(): array
    {
        return $this->attributes;
    }
}
