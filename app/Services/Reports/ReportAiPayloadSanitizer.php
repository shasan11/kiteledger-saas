<?php

namespace App\Services\Reports;

use App\Services\AI\AiSettingsService;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class ReportAiPayloadSanitizer
{
    private const MAX_COLUMNS = 30;
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

        $reportedRowCount = max(
            count($payload['rows'] ?? []),
            (int) ($payload['metadata']['row_count'] ?? 0),
        );

        return [
            'category' => $this->text($payload['category'] ?? 'report', 80),
            'report_key' => $this->text($payload['report_key'] ?? '', 120),
            'report_title' => $this->text($payload['report_title'] ?? 'Report', 200),
            'filters' => $this->cleanAssoc($payload['filters'] ?? [], 25),
            'columns' => $columns,
            'rows' => $rows,
            'totals' => $this->cleanAssoc($payload['totals'] ?? [], self::MAX_TOTALS),
            'summary_cards' => $this->summaryBlocks($payload['summary_cards'] ?? []),
            'metadata' => [
                'currency' => $this->text($payload['metadata']['currency'] ?? '', 20),
                'branch' => $this->text($payload['metadata']['branch'] ?? '', 120),
                'fiscal_year' => $this->text($payload['metadata']['fiscal_year'] ?? '', 120),
                'generated_at' => $this->text($payload['metadata']['generated_at'] ?? now()->toIso8601String(), 80),
                'row_count' => $reportedRowCount,
                'sampled_row_count' => count($rows),
                'omitted_row_count' => max(0, $reportedRowCount - count($rows)),
                'sampled' => $reportedRowCount > count($rows),
            ],
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
        $limit = min(100, $this->settings->reportSummaryMaxRows());

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
            if (is_array($label) || is_object($label) || is_array($value) || is_object($value)) {
                continue;
            }

            $out[] = [
                'label' => $this->text($label ?? 'Summary', 120),
                'value' => $this->scalar($value),
            ];
        }

        return array_slice($out, 0, self::MAX_TOTALS);
    }

    private function cleanAssoc(array $values, int $limit, int $depth = 0): array
    {
        if ($depth >= 3) {
            return [];
        }

        $out = [];

        foreach ($values as $key => $value) {
            $key = (string) $key;
            if ($this->isSensitiveKey($key) || is_array($value) && Str::contains(strtolower($key), ['schema', 'payload'])) {
                continue;
            }

            if (is_array($value)) {
                $out[$this->humanize($key)] = $this->cleanAssoc($value, 10, $depth + 1);
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
            $containsSensitiveTerm = $needle !== 'id' && str_contains($lower, $needle);
            if ($lower === $needle || str_ends_with($lower, '_'.$needle) || $containsSensitiveTerm) {
                return true;
            }
        }

        return false;
    }
}
