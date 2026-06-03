<?php

namespace App\Services\Reports;

use App\Services\AI\AiSettingsService;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class ReportAiPayloadSanitizer
{
    private const MAX_COLUMNS = 20;
    private const MAX_TOTALS = 30;
    private const MAX_TEXT_LENGTH = 500;

    private const SENSITIVE_KEYS = [
        'id', 'uuid', 'token', 'api_key', 'apikey', 'password', 'secret',
        'payload', 'schema', 'json', 'raw', 'normalized', 'created_at',
        'updated_at', 'deleted_at', 'remember_token',
    ];

    public function __construct(private readonly AiSettingsService $settings)
    {
    }

    public function sanitize(array $payload): array
    {
        $columns = $this->columns($payload['columns'] ?? []);
        $rows = $this->rows($payload['rows'] ?? [], $columns);

        return [
            'category' => $this->text($payload['category'] ?? 'report', 80),
            'report_key' => $this->text($payload['report_key'] ?? '', 120),
            'title' => $this->text($payload['title'] ?? 'Report', 200),
            'filters' => $this->cleanAssoc($payload['filters'] ?? [], 25),
            'columns' => $columns,
            'rows' => $rows,
            'row_count' => is_array($payload['rows'] ?? null) ? count($payload['rows']) : 0,
            'totals' => $this->cleanAssoc($payload['totals'] ?? [], self::MAX_TOTALS),
            'summary_blocks' => $this->summaryBlocks($payload['summary_blocks'] ?? $payload['summary'] ?? []),
            'chart_data' => $this->chartData($payload['chart_data'] ?? []),
            'generated_at' => $this->text($payload['generated_at'] ?? now()->toDateTimeString(), 80),
        ];
    }

    public function cacheFingerprint(array $context): string
    {
        return hash('sha256', json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    }

    private function columns(array $columns): array
    {
        $out = [];

        foreach ($columns as $column) {
            if (!is_array($column)) {
                continue;
            }

            $key = (string) ($column['key'] ?? $column['dataIndex'] ?? '');
            if ($key === '' || $this->isSensitiveKey($key)) {
                continue;
            }

            $out[] = [
                'key' => $key,
                'label' => $this->text($column['title'] ?? $this->humanize($key), 120),
            ];

            if (count($out) >= self::MAX_COLUMNS) {
                break;
            }
        }

        return $out;
    }

    private function rows(array $rows, array $columns): array
    {
        $out = [];
        $allowed = collect($columns)->pluck('label', 'key')->all();
        $limit = min(50, $this->settings->reportSummaryMaxRows());

        foreach (array_slice($rows, 0, $limit) as $row) {
            if (!is_array($row)) {
                continue;
            }

            $clean = [];
            foreach ($allowed as $key => $label) {
                $value = Arr::get($row, $key);
                if (is_array($value) || is_object($value)) {
                    continue;
                }
                $clean[$label] = $this->scalar($value);
            }

            if ($clean !== []) {
                $out[] = $clean;
            }
        }

        return $out;
    }

    private function summaryBlocks(array $blocks): array
    {
        $out = [];

        foreach ($blocks as $block) {
            if (!is_array($block)) {
                continue;
            }

            $label = $block['label'] ?? $block['title'] ?? $block['name'] ?? null;
            $value = $block['value'] ?? $block['amount'] ?? $block['total'] ?? null;
            if ($label === null && $value === null) {
                continue;
            }

            $out[] = [
                'label' => $this->text($label ?? 'Summary', 120),
                'value' => $this->scalar($value),
            ];
        }

        return array_slice($out, 0, self::MAX_TOTALS);
    }

    private function chartData(array $chartData): array
    {
        $out = [];

        foreach (array_slice($chartData, 0, 20) as $item) {
            if (!is_array($item)) {
                continue;
            }

            $out[] = $this->cleanAssoc($item, 8);
        }

        return $out;
    }

    private function cleanAssoc(array $values, int $limit): array
    {
        $out = [];

        foreach ($values as $key => $value) {
            $key = (string) $key;
            if ($this->isSensitiveKey($key) || is_array($value) && Str::contains(strtolower($key), ['schema', 'payload'])) {
                continue;
            }

            if (is_array($value)) {
                $out[$this->humanize($key)] = $this->cleanAssoc($value, 10);
            } elseif (!is_object($value)) {
                $out[$this->humanize($key)] = $this->scalar($value);
            }

            if (count($out) >= $limit) {
                break;
            }
        }

        return $out;
    }

    private function scalar(mixed $value): string|int|float|bool|null
    {
        if (is_bool($value) || is_int($value) || is_float($value) || $value === null) {
            return $value;
        }

        return $this->text($value, self::MAX_TEXT_LENGTH);
    }

    private function text(mixed $value, int $length): string
    {
        return Str::limit(trim((string) $value), $length, '');
    }

    private function humanize(string $key): string
    {
        return Str::headline(str_replace(['.', '_', '-'], ' ', $key));
    }

    private function isSensitiveKey(string $key): bool
    {
        $lower = strtolower($key);

        foreach (self::SENSITIVE_KEYS as $needle) {
            if ($lower === $needle || str_ends_with($lower, '_' . $needle) || str_contains($lower, $needle)) {
                return true;
            }
        }

        return false;
    }
}
