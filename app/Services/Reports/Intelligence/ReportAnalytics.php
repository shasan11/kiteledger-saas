<?php

declare(strict_types=1);

namespace App\Services\Reports\Intelligence;

/**
 * The verified, server-computed analysis of one report execution.
 *
 * Every figure here was calculated from the report engine's own output by
 * deterministic PHP, never by a model. The LLM receives this object and is
 * asked to explain it; it is not permitted to contribute numbers of its own,
 * and the numbers the user finally sees are read back from here rather than
 * from the model's prose.
 */
final readonly class ReportAnalytics
{
    /**
     * @param  array<int, array{key: string, label: string, value: float|int, currency: string|null, kind: string, measure: string}>  $keyNumbers
     * @param  array<int, array{label: string, value: float, share_percent: float}>  $concentration
     * @param  array<int, array{code: string, severity: string, message: string}>  $anomalies
     * @param  array<string, mixed>  $columnStats
     * @param  array<string, mixed>  $scope
     * @param  array<int, array<string, mixed>>  $sampleRows
     */
    public function __construct(
        public string $reportKey,
        public string $reportTitle,
        public int $rowCount,
        public array $keyNumbers = [],
        public array $concentration = [],
        public array $anomalies = [],
        public array $columnStats = [],
        public array $scope = [],
        public array $sampleRows = [],
    ) {}

    public function isEmpty(): bool
    {
        return $this->rowCount === 0 && $this->keyNumbers === [];
    }

    /**
     * Compact context handed to the model.
     *
     * Deliberately not the raw report: a hundred arbitrary rows produce vague
     * commentary, while a small verified analytics package produces specific
     * observations. A short row sample is included only so the model can name
     * real entities, never so it can total them.
     *
     * @return array<string, mixed>
     */
    public function toPromptContext(): array
    {
        return array_filter([
            'report' => $this->reportTitle,
            'row_count' => $this->rowCount,
            'scope' => $this->scope,
            'verified_key_numbers' => $this->keyNumbers,
            'concentration' => $this->concentration,
            'detected_anomalies' => $this->anomalies,
            'column_statistics' => $this->columnStats,
            'row_sample' => $this->sampleRows,
        ], static fn ($value) => $value !== [] && $value !== null);
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'report_key' => $this->reportKey,
            'report_title' => $this->reportTitle,
            'row_count' => $this->rowCount,
            'key_numbers' => $this->keyNumbers,
            'concentration' => $this->concentration,
            'anomalies' => $this->anomalies,
            'scope' => $this->scope,
        ];
    }
}
