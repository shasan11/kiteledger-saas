<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot\Tools;

use Illuminate\Support\Carbon;

/**
 * Typed envelope returned by every Copilot tool.
 *
 * Deliberately never carries Eloquent models or raw database rows: rows are
 * flattened scalars only, so the model cannot be handed an object graph it
 * might echo, and identifiers never reach the prompt.
 */
final readonly class CopilotToolResult
{
    /**
     * @param array<int, array<string, scalar|null>> $rows
     * @param array<string, mixed> $metrics
     * @param array<string, mixed> $appliedFilters
     * @param string[] $limitations
     */
    public function __construct(
        public string $tool,
        public bool $verified,
        public string $dataSource,
        public array $rows = [],
        public array $metrics = [],
        public array $appliedFilters = [],
        public ?string $currency = null,
        public ?string $dateFrom = null,
        public ?string $dateTo = null,
        public ?string $branchScope = null,
        public ?string $fiscalYearScope = null,
        public ?string $calculationDefinition = null,
        public array $limitations = [],
        public ?Carbon $asOf = null,
        public ?string $sourceLabel = null,
        /**
         * The query service's own one-line summary. Any figure inside it was
         * computed by that deterministic service, so it is safe to surface
         * verbatim — unlike a total re-derived downstream.
         */
        public ?string $summary = null,
    ) {}

    /**
     * Payload handed to the language model. Explicitly enumerated — never a
     * blanket serialization — so a new internal field cannot leak by default.
     */
    public function forModel(): array
    {
        return array_filter([
            'verified' => $this->verified,
            'source' => $this->dataSource,
            'summary' => $this->summary,
            'calculation' => $this->calculationDefinition,
            'currency' => $this->currency,
            'date_from' => $this->dateFrom,
            'date_to' => $this->dateTo,
            'branch_scope' => $this->branchScope,
            'fiscal_year_scope' => $this->fiscalYearScope,
            'filters' => $this->appliedFilters,
            'metrics' => $this->metrics,
            'rows' => $this->rows,
            'limitations' => $this->limitations,
            'as_of' => $this->asOf?->toIso8601String(),
        ], static fn ($value) => $value !== null && $value !== []);
    }

    public function toJson(): string
    {
        return (string) json_encode($this->forModel(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    /** Trace-safe summary: shape and counts, never values. */
    public function toTraceArray(): array
    {
        return [
            'tool' => $this->tool,
            'verified' => $this->verified,
            'source' => $this->dataSource,
            'row_count' => count($this->rows),
            'metric_keys' => array_keys($this->metrics),
            'filters' => array_keys($this->appliedFilters),
        ];
    }
}
