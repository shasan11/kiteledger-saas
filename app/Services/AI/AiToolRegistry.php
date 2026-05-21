<?php

namespace App\Services\AI;

/**
 * Registry for future Prism tool/function calling integrations.
 * Currently a placeholder — tools will be registered here as Prism tool definitions.
 */
class AiToolRegistry
{
    protected array $tools = [];

    public function register(string $name, array $definition): void
    {
        $this->tools[$name] = $definition;
    }

    public function all(): array
    {
        return $this->tools;
    }

    public function get(string $name): ?array
    {
        return $this->tools[$name] ?? null;
    }
}
