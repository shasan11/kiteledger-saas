<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot\Metrics;

use App\Services\AI\Copilot\CopilotException;
use Illuminate\Support\Carbon;
use Throwable;

/**
 * Validated arguments for a metric calculation.
 *
 * Every value is normalized here, before it can reach a handler. The model
 * supplies intent-shaped arguments; this class decides what is actually legal.
 */
final readonly class MetricQuery
{
    private const OPERATIONS = ['summary', 'rank', 'list', 'ageing', 'by_branch', 'by_product', 'by_warehouse', 'low_stock', 'dead_stock', 'fast_moving'];

    /**
     * @param string[] $statuses
     */
    public function __construct(
        public string $metric,
        public string $operation,
        public ?string $dateFrom,
        public ?string $dateTo,
        public array $statuses,
        public ?string $groupBy,
        public string $sortDirection,
        public int $limit,
    ) {}

    /**
     * @param array<string, mixed> $input
     */
    public static function fromArray(array $input): self
    {
        $metric = strtolower(trim((string) ($input['metric'] ?? '')));

        if ($metric === '' || ! preg_match('/^[a-z_]{3,60}$/', $metric)) {
            throw new CopilotException(
                'A valid metric key is required.',
                CopilotException::AI_TOOL_VALIDATION_FAILED,
            );
        }

        $operation = strtolower(trim((string) ($input['operation'] ?? 'summary'))) ?: 'summary';

        if (! in_array($operation, self::OPERATIONS, true)) {
            throw new CopilotException(
                'Unsupported operation for a financial metric.',
                CopilotException::AI_TOOL_VALIDATION_FAILED,
            );
        }

        $statuses = array_values(array_slice(array_filter(
            array_map(
                static fn ($s) => is_string($s) ? mb_substr(preg_replace('/[^a-z_ ]/i', '', $s) ?? '', 0, 40) : '',
                (array) ($input['statuses'] ?? []),
            ),
            static fn ($s) => $s !== '',
        ), 0, 10));

        $groupBy = trim((string) ($input['group_by'] ?? ''));
        $groupBy = $groupBy !== '' && preg_match('/^[a-z_]{2,40}$/i', $groupBy) ? strtolower($groupBy) : null;

        $limit = (int) ($input['limit'] ?? 0);

        return new self(
            metric: $metric,
            operation: $operation,
            dateFrom: self::normalizeDate($input['date_from'] ?? null),
            dateTo: self::normalizeDate($input['date_to'] ?? null),
            statuses: $statuses,
            groupBy: $groupBy,
            sortDirection: strtolower((string) ($input['sort_direction'] ?? 'desc')) === 'asc' ? 'asc' : 'desc',
            limit: $limit > 0 ? min($limit, 200) : 0,
        );
    }

    private static function normalizeDate(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->toDateString();
        } catch (Throwable) {
            throw new CopilotException(
                'A supplied date could not be understood.',
                CopilotException::AI_TOOL_VALIDATION_FAILED,
            );
        }
    }

    /** Arguments forwarded to the deterministic handler's Request. */
    public function toRequestInputs(): array
    {
        return array_filter([
            'from_date' => $this->dateFrom,
            'to_date' => $this->dateTo,
            'date_from' => $this->dateFrom,
            'date_to' => $this->dateTo,
            'status' => $this->statuses !== [] ? implode(',', $this->statuses) : null,
            'limit' => $this->limit > 0 ? $this->limit : null,
        ], static fn ($v) => $v !== null);
    }

    /** @return array<string, mixed> */
    public function appliedFilters(): array
    {
        return array_filter([
            'metric' => $this->metric,
            'operation' => $this->operation,
            'date_from' => $this->dateFrom,
            'date_to' => $this->dateTo,
            'statuses' => $this->statuses !== [] ? $this->statuses : null,
            'group_by' => $this->groupBy,
            'sort_direction' => $this->sortDirection,
            'limit' => $this->limit > 0 ? $this->limit : null,
        ], static fn ($v) => $v !== null);
    }
}
