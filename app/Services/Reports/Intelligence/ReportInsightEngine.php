<?php

declare(strict_types=1);

namespace App\Services\Reports\Intelligence;

use App\Support\Money\CurrencyFormatter;
use Illuminate\Support\Str;

/**
 * Computes the statistics a business summary actually needs, before any model
 * is involved.
 *
 * The previous summarizer handed a hundred sampled rows to the LLM and hoped
 * for business intelligence. That produces confident-sounding generalities and,
 * worse, arithmetic the model invented. Everything measurable is measured here
 * instead — totals, distribution, concentration, ageing, outliers — so the
 * model's only job is to say what the verified figures mean.
 *
 * All detection is structural (value shapes and column names), so it works
 * across all report categories without a per-report configuration table.
 */
final class ReportInsightEngine
{
    /** Column names that identify a row rather than measure it. */
    private const DIMENSION_HINTS = [
        'name', 'customer', 'supplier', 'contact', 'party', 'product', 'item',
        'account', 'branch', 'warehouse', 'category', 'employee', 'department',
        'description', 'particulars', 'voucher', 'reference', 'number', 'code',
        'status', 'type', 'date', 'period', 'month', 'bucket',
    ];

    /** Columns whose totals are meaningless (running balances, rates, ages). */
    private const NON_ADDITIVE_HINTS = [
        'running', 'balance_bf', 'opening_balance', 'closing_balance',
        'rate', 'percent', 'percentage', 'age', 'days', 'ratio', 'margin_percent',
    ];

    private const AGEING_HINTS = ['0-30', '31-60', '61-90', '91-120', '120+', 'not due', 'overdue'];

    public function __construct(private readonly CurrencyFormatter $currency) {}

    /**
     * @param  array<string, mixed>  $report  the report engine's own payload
     * @param  array<string, mixed>  $scope
     */
    public function analyze(array $report, array $scope): ReportAnalytics
    {
        $rows = array_values(array_filter($report['rows'] ?? [], 'is_array'));
        $columns = $this->columns($report, $rows);
        $currency = $scope['currency'] ?? null;

        $numericColumns = $this->numericColumns($rows, $columns);
        $dimensionColumn = $this->dimensionColumn($rows, $columns, $numericColumns);
        $primaryColumn = $this->primaryMeasure($numericColumns);

        $columnStats = [];
        $keyNumbers = [];

        foreach ($numericColumns as $key => $label) {
            $values = $this->valuesFor($rows, $key);

            if ($values === []) {
                continue;
            }

            $stats = $this->describe($values);
            $columnStats[$label] = $stats;

            // Only additive measures become headline totals; summing a running
            // balance column would present a meaningless number as a fact.
            if ($this->isAdditive($key)) {
                $keyNumbers[] = [
                    'key' => $key,
                    'label' => 'Total '.Str::lower($label),
                    'value' => $stats['total'],
                    'currency' => $currency,
                    'kind' => 'total',
                    'measure' => $this->measureFor($key, $label),
                ];
            }
        }

        $keyNumbers = array_merge(
            $this->summaryCardNumbers($report, $currency),
            $this->totalsNumbers($report, $currency),
            $keyNumbers,
        );

        if ($primaryColumn !== null && $rows !== []) {
            $keyNumbers = array_merge($keyNumbers, $this->distributionNumbers(
                $rows,
                $primaryColumn,
                $numericColumns[$primaryColumn],
                $currency,
            ));
        }

        $concentration = $primaryColumn !== null && $dimensionColumn !== null
            ? $this->concentration($rows, $dimensionColumn, $primaryColumn)
            : [];

        return new ReportAnalytics(
            reportKey: (string) ($report['report_key'] ?? ''),
            reportTitle: (string) ($report['title'] ?? 'Report'),
            rowCount: count($rows),
            keyNumbers: $this->renderKeyNumbers($this->dedupeKeyNumbers($keyNumbers)),
            concentration: $concentration,
            anomalies: $this->anomalies($rows, $numericColumns, $dimensionColumn, $primaryColumn, $concentration),
            columnStats: $columnStats,
            scope: $scope,
            sampleRows: $this->sampleRows($rows, $columns, $dimensionColumn, $primaryColumn),
        );
    }

    // ---------- Column discovery ----------

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<string, string> key => label
     */
    private function columns(array $report, array $rows): array
    {
        $columns = [];

        foreach ($report['columns'] ?? [] as $column) {
            if (! is_array($column)) {
                continue;
            }

            $key = (string) ($column['key'] ?? $column['dataIndex'] ?? '');

            if ($key !== '') {
                $columns[$key] = (string) ($column['title'] ?? Str::headline($key));
            }
        }

        // Some report services return rows without a column definition; fall
        // back to the shape of the first row so those are still analyzed.
        if ($columns === [] && isset($rows[0]) && is_array($rows[0])) {
            foreach (array_keys($rows[0]) as $key) {
                $columns[(string) $key] = Str::headline((string) $key);
            }
        }

        return $columns;
    }

    /**
     * Columns that actually hold numbers.
     *
     * Decided from the values, not the column name: a "Reference" column of
     * invoice numbers looks numeric by name and is not a measure, while a
     * "Movement" column may be. A column qualifies only when most of its
     * populated values are numeric.
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<string, string>  $columns
     * @return array<string, string>
     */
    private function numericColumns(array $rows, array $columns): array
    {
        $numeric = [];

        foreach ($columns as $key => $label) {
            if ($this->looksLikeIdentifier($key)) {
                continue;
            }

            $populated = 0;
            $numericCount = 0;

            foreach ($rows as $row) {
                $value = $row[$key] ?? null;

                if ($value === null || $value === '') {
                    continue;
                }

                $populated++;

                if (is_int($value) || is_float($value) || (is_string($value) && is_numeric(str_replace(',', '', $value)))) {
                    $numericCount++;
                }
            }

            if ($populated > 0 && $numericCount / $populated >= 0.8) {
                $numeric[$key] = $label;
            }
        }

        return $numeric;
    }

    /**
     * The column that names each row, used for "top 5 customers" style output.
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<string, string>  $columns
     * @param  array<string, string>  $numericColumns
     */
    private function dimensionColumn(array $rows, array $columns, array $numericColumns): ?string
    {
        $candidates = array_diff_key($columns, $numericColumns);

        foreach (self::DIMENSION_HINTS as $hint) {
            foreach ($candidates as $key => $label) {
                if (str_contains(Str::lower($key), $hint) && $this->hasVariedValues($rows, $key)) {
                    return $key;
                }
            }
        }

        foreach ($candidates as $key => $label) {
            if ($this->hasVariedValues($rows, $key)) {
                return $key;
            }
        }

        return null;
    }

    /**
     * The measure a business user would consider "the" number in this report.
     *
     * @param  array<string, string>  $numericColumns
     */
    private function primaryMeasure(array $numericColumns): ?string
    {
        $preferred = ['amount', 'total', 'balance', 'net', 'value', 'due', 'outstanding', 'quantity', 'qty'];

        foreach ($preferred as $hint) {
            foreach (array_keys($numericColumns) as $key) {
                if (str_contains(Str::lower($key), $hint) && $this->isAdditive($key)) {
                    return $key;
                }
            }
        }

        foreach (array_keys($numericColumns) as $key) {
            if ($this->isAdditive($key)) {
                return $key;
            }
        }

        return null;
    }

    // ---------- Statistics ----------

    /**
     * @param  float[]  $values
     * @return array<string, float|int>
     */
    private function describe(array $values): array
    {
        sort($values);
        $count = count($values);
        $total = array_sum($values);

        return [
            'count' => $count,
            'total' => round($total, 2),
            'average' => round($total / $count, 2),
            'median' => round($this->median($values), 2),
            'min' => round($values[0], 2),
            'max' => round($values[$count - 1], 2),
            'negative_count' => count(array_filter($values, static fn (float $v): bool => $v < 0)),
            'zero_count' => count(array_filter($values, static fn (float $v): bool => $v === 0.0)),
        ];
    }

    /** @param float[] $sorted */
    private function median(array $sorted): float
    {
        $count = count($sorted);
        $middle = intdiv($count, 2);

        return $count % 2 === 1
            ? $sorted[$middle]
            : ($sorted[$middle - 1] + $sorted[$middle]) / 2;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array{key: string, label: string, value: float|int, currency: string|null, kind: string, measure: string}>
     */
    private function distributionNumbers(array $rows, string $key, string $label, ?string $currency): array
    {
        $values = $this->valuesFor($rows, $key);

        if ($values === []) {
            return [];
        }

        $stats = $this->describe($values);

        return [
            [
                'key' => $key.'_average',
                'label' => 'Average '.Str::lower($label),
                'value' => $stats['average'],
                'currency' => $currency,
                'kind' => 'average',
                'measure' => $this->measureFor($key, $label),
            ],
            [
                'key' => $key.'_max',
                'label' => 'Largest '.Str::lower($label),
                'value' => $stats['max'],
                'currency' => $currency,
                'kind' => 'max',
                'measure' => $this->measureFor($key, $label),
            ],
        ];
    }

    /**
     * Share of the primary measure held by the largest contributors.
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array{label: string, value: float, share_percent: float}>
     */
    private function concentration(array $rows, string $dimension, string $measure): array
    {
        $grouped = [];

        foreach ($rows as $row) {
            $label = $row[$dimension] ?? null;

            if (! is_scalar($label) || trim((string) $label) === '') {
                continue;
            }

            $grouped[(string) $label] = ($grouped[(string) $label] ?? 0) + $this->toFloat($row[$measure] ?? null);
        }

        if ($grouped === []) {
            return [];
        }

        // Concentration is measured against the positive total: mixing credits
        // in would make a share exceed 100% and read as nonsense.
        $total = array_sum(array_filter($grouped, static fn (float $v): bool => $v > 0));

        if ($total <= 0.0) {
            return [];
        }

        arsort($grouped);

        $out = [];

        foreach (array_slice($grouped, 0, 5, true) as $label => $value) {
            if ($value <= 0) {
                continue;
            }

            $out[] = [
                'label' => Str::limit((string) $label, 80, ''),
                'value' => round($value, 2),
                'share_percent' => round($value / $total * 100, 2),
            ];
        }

        return $out;
    }

    // ---------- Anomalies ----------

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<string, string>  $numericColumns
     * @param  array<int, array{label: string, value: float, share_percent: float}>  $concentration
     * @return array<int, array{code: string, severity: string, message: string}>
     */
    private function anomalies(
        array $rows,
        array $numericColumns,
        ?string $dimensionColumn,
        ?string $primaryColumn,
        array $concentration,
    ): array {
        $anomalies = [];

        if ($rows === []) {
            return [[
                'code' => 'EMPTY_REPORT',
                'severity' => 'info',
                'message' => 'The report returned no rows for the selected filters.',
            ]];
        }

        foreach ($numericColumns as $key => $label) {
            $values = $this->valuesFor($rows, $key);

            if ($values === []) {
                continue;
            }

            $negatives = count(array_filter($values, static fn (float $v): bool => $v < 0));

            if ($negatives > 0 && $this->isAdditive($key)) {
                $anomalies[] = [
                    'code' => 'NEGATIVE_VALUES',
                    'severity' => 'warning',
                    'message' => sprintf('%d of %d rows have a negative %s.', $negatives, count($values), Str::lower($label)),
                ];
            }

            if ($outliers = $this->outliers($values)) {
                $anomalies[] = [
                    'code' => 'OUTLIER_VALUES',
                    'severity' => 'info',
                    'message' => sprintf(
                        '%d %s value(s) sit far outside the typical range (median %s, largest %s).',
                        count($outliers),
                        Str::lower($label),
                        $this->number($this->median($this->sorted($values))),
                        $this->number(max($values)),
                    ),
                ];
            }
        }

        if ($concentration !== [] && $concentration[0]['share_percent'] >= 40.0) {
            $anomalies[] = [
                'code' => 'HIGH_CONCENTRATION',
                'severity' => 'warning',
                'message' => sprintf(
                    '%s alone accounts for %.1f%% of the total.',
                    $concentration[0]['label'],
                    $concentration[0]['share_percent'],
                ),
            ];
        }

        if ($ageing = $this->ageingConcentration($rows)) {
            $anomalies[] = $ageing;
        }

        if ($primaryColumn !== null) {
            $missing = 0;

            foreach ($rows as $row) {
                $value = $row[$primaryColumn] ?? null;

                if ($value === null || $value === '') {
                    $missing++;
                }
            }

            if ($missing > 0) {
                $anomalies[] = [
                    'code' => 'MISSING_VALUES',
                    'severity' => 'warning',
                    'message' => sprintf('%d of %d rows have no value in the main amount column.', $missing, count($rows)),
                ];
            }
        }

        return array_slice($anomalies, 0, 10);
    }

    /**
     * Overdue exposure, when the report carries ageing buckets.
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @return array{code: string, severity: string, message: string}|null
     */
    private function ageingConcentration(array $rows): ?array
    {
        $bucketKey = null;

        foreach (array_keys($rows[0] ?? []) as $key) {
            if (str_contains(Str::lower((string) $key), 'bucket') || Str::lower((string) $key) === 'ageing') {
                $bucketKey = (string) $key;
                break;
            }
        }

        if ($bucketKey === null) {
            return null;
        }

        $amountKey = null;

        foreach (array_keys($rows[0]) as $key) {
            $lower = Str::lower((string) $key);

            if (str_contains($lower, 'amount') || str_contains($lower, 'balance') || str_contains($lower, 'due')) {
                $amountKey = (string) $key;
                break;
            }
        }

        if ($amountKey === null) {
            return null;
        }

        $total = 0.0;
        $aged = 0.0;

        foreach ($rows as $row) {
            $amount = $this->toFloat($row[$amountKey] ?? null);
            $bucket = Str::lower((string) ($row[$bucketKey] ?? ''));

            if ($amount <= 0) {
                continue;
            }

            $total += $amount;

            if (str_contains($bucket, '61-90') || str_contains($bucket, '91-120') || str_contains($bucket, '120+')) {
                $aged += $amount;
            }
        }

        if ($total <= 0.0 || $aged <= 0.0) {
            return null;
        }

        $share = round($aged / $total * 100, 1);

        return $share < 15.0 ? null : [
            'code' => 'AGED_EXPOSURE',
            'severity' => $share >= 30.0 ? 'critical' : 'warning',
            'message' => sprintf('%.1f%% of the outstanding total is more than 60 days old.', $share),
        ];
    }

    /**
     * Values beyond three median-absolute-deviations.
     *
     * MAD rather than standard deviation: accounting data is routinely skewed
     * by a handful of large documents, and a mean-based rule would flag half
     * the report as anomalous.
     *
     * @param  float[]  $values
     * @return float[]
     */
    private function outliers(array $values): array
    {
        if (count($values) < 8) {
            return [];
        }

        $sorted = $this->sorted($values);
        $median = $this->median($sorted);

        $deviations = array_map(static fn (float $v): float => abs($v - $median), $sorted);
        sort($deviations);
        $mad = $this->median($deviations);

        if ($mad <= 0.0) {
            return [];
        }

        return array_values(array_filter(
            $values,
            static fn (float $v): bool => abs($v - $median) > 3 * 1.4826 * $mad,
        ));
    }

    // ---------- Report-supplied figures ----------

    /**
     * @return array<int, array{key: string, label: string, value: float|int, currency: string|null, kind: string, measure: string}>
     */
    private function summaryCardNumbers(array $report, ?string $currency): array
    {
        $out = [];

        foreach ($report['summary'] ?? [] as $index => $card) {
            if (! is_array($card)) {
                continue;
            }

            $label = $card['label'] ?? $card['title'] ?? $card['name'] ?? null;
            $value = $card['value'] ?? $card['amount'] ?? $card['total'] ?? null;

            if (! is_scalar($label) || ! is_numeric($value)) {
                continue;
            }

            $out[] = [
                'key' => 'summary_'.$index,
                'label' => Str::limit((string) $label, 80, ''),
                'value' => round((float) $value, 2),
                'currency' => $currency,
                'kind' => 'summary_card',
                'measure' => $this->measureFor((string) $label),
            ];
        }

        return $out;
    }

    /**
     * @return array<int, array{key: string, label: string, value: float|int, currency: string|null, kind: string, measure: string}>
     */
    private function totalsNumbers(array $report, ?string $currency): array
    {
        $out = [];

        foreach ($report['totals'] ?? [] as $key => $value) {
            if (! is_numeric($value)) {
                continue;
            }

            $out[] = [
                'key' => 'total_'.$key,
                'label' => Str::headline((string) $key),
                'value' => round((float) $value, 2),
                'currency' => $currency,
                'kind' => 'report_total',
                'measure' => $this->measureFor((string) $key),
            ];
        }

        return $out;
    }

    // ---------- Helpers ----------

    /**
     * The report engine's own totals win over a column sum of the same measure:
     * the engine knows about opening balances and rounding rules that a naive
     * column sum does not.
     *
     * @param  array<int, array{key: string, label: string, value: float|int, currency: string|null, kind: string, measure: string}>  $numbers
     * @return array<int, array{key: string, label: string, value: float|int, currency: string|null, kind: string, measure: string}>
     */
    private function dedupeKeyNumbers(array $numbers): array
    {
        $seen = [];
        $out = [];

        foreach ($numbers as $number) {
            $label = Str::lower($number['label']);

            if (isset($seen[$label])) {
                continue;
            }

            $seen[$label] = true;
            $out[] = $number;
        }

        return array_slice($out, 0, 12);
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return float[]
     */
    private function valuesFor(array $rows, string $key): array
    {
        $values = [];

        foreach ($rows as $row) {
            $value = $row[$key] ?? null;

            if ($value === null || $value === '' || is_array($value) || is_object($value)) {
                continue;
            }

            $values[] = $this->toFloat($value);
        }

        return $values;
    }

    /** @param float[] $values */
    private function sorted(array $values): array
    {
        sort($values);

        return $values;
    }

    private function toFloat(mixed $value): float
    {
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }

        return (float) str_replace([',', ' '], '', (string) $value);
    }

    private function number(float $value): string
    {
        return number_format($value, 2);
    }

    /**
     * Attaches the display string every consumer needs.
     *
     * The same rendered figure then reaches the summary drawer, the legacy
     * envelope and the model's prompt, so the currency cannot disagree between
     * what the user reads and what the commentary says.
     *
     * @param  array<int, array<string, mixed>>  $numbers
     * @return array<int, array<string, mixed>>
     */
    private function renderKeyNumbers(array $numbers): array
    {
        return array_map(function (array $number): array {
            $money = ($number['measure'] ?? 'money') === 'money';

            $number['currency'] = $money
                ? ($number['currency'] ?? $this->currency->base()->code)
                : null;

            $number['formatted'] = $money
                ? $this->currency->format($number['value'], $number['currency'])
                : $this->currency->plain($number['value']);

            return $number;
        }, $numbers);
    }

    /**
     * Whether a key number is money or a plain count.
     *
     * Reports mix the two freely - "Total sales" and "Invoice count" sit in the
     * same totals array - so the column name decides, not the report. Any hint
     * that reads as money is enough; "Qty" and "Invoice Count" stay numbers.
     */
    private function measureFor(string ...$hints): string
    {
        foreach ($hints as $hint) {
            if (CurrencyFormatter::looksMonetary($hint)) {
                return 'money';
            }
        }

        return 'number';
    }

    private function isAdditive(string $key): bool
    {
        $lower = Str::lower($key);

        foreach (self::NON_ADDITIVE_HINTS as $hint) {
            if (str_contains($lower, $hint)) {
                return false;
            }
        }

        return true;
    }

    private function looksLikeIdentifier(string $key): bool
    {
        $lower = Str::lower($key);

        return $lower === 'id'
            || str_ends_with($lower, '_id')
            || str_contains($lower, 'uuid')
            || str_contains($lower, 'voucher_no')
            || str_contains($lower, 'invoice_no')
            || str_contains($lower, 'reference');
    }

    /** @param array<int, array<string, mixed>> $rows */
    private function hasVariedValues(array $rows, string $key): bool
    {
        $seen = [];

        foreach ($rows as $row) {
            $value = $row[$key] ?? null;

            if (is_scalar($value) && trim((string) $value) !== '') {
                $seen[(string) $value] = true;
            }

            if (count($seen) > 1) {
                return true;
            }
        }

        return false;
    }

    /**
     * A handful of representative rows so the model can name real entities.
     *
     * The largest rows by the primary measure, because those are the ones a
     * reader would ask about.
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<string, string>  $columns
     * @return array<int, array<string, mixed>>
     */
    private function sampleRows(array $rows, array $columns, ?string $dimension, ?string $measure): array
    {
        if ($rows === [] || $dimension === null || $measure === null) {
            return [];
        }

        usort($rows, fn (array $a, array $b): int => $this->toFloat($b[$measure] ?? null) <=> $this->toFloat($a[$measure] ?? null));

        $out = [];

        foreach (array_slice($rows, 0, 5) as $row) {
            $label = $row[$dimension] ?? null;

            if (! is_scalar($label)) {
                continue;
            }

            $out[] = [
                ($columns[$dimension] ?? $dimension) => Str::limit((string) $label, 80, ''),
                ($columns[$measure] ?? $measure) => round($this->toFloat($row[$measure] ?? null), 2),
            ];
        }

        return $out;
    }
}
