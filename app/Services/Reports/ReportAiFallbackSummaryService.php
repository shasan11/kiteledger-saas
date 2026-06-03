<?php

namespace App\Services\Reports;

class ReportAiFallbackSummaryService
{
    public function summarize(array $context, ?string $reason = null): array
    {
        $keyNumbers = $this->keyNumbers($context);
        $title = $context['title'] ?? 'this report';
        $rowCount = (int) ($context['row_count'] ?? count($context['rows'] ?? []));

        return [
            'ok' => true,
            'ai_unavailable' => $reason !== null,
            'summary' => $this->summary($title, $rowCount, $keyNumbers),
            'key_numbers' => $keyNumbers,
            'observations' => $this->observations($context),
            'risks' => [
                'Review unusually high balances, overdue items, negative values, or rows that differ materially from expected trends.',
                'Confirm the selected filters and reporting period before making operational or financial decisions.',
            ],
            'actions' => [
                'Drill into the highest-value rows and reconcile them with source transactions.',
                'Compare this report with the prior period or exported detail when a variance needs explanation.',
            ],
            'source_note' => 'Summary is based only on the currently generated report rows, filters, totals, and summary cards.',
            'generated_at' => now()->toDateTimeString(),
        ];
    }

    private function keyNumbers(array $context): array
    {
        $items = [];

        foreach (($context['summary_blocks'] ?? []) as $block) {
            if (!is_array($block)) {
                continue;
            }
            $items[] = [
                'label' => (string) ($block['label'] ?? 'Summary'),
                'value' => $block['value'] ?? null,
            ];
        }

        foreach (($context['totals'] ?? []) as $label => $value) {
            $items[] = [
                'label' => (string) $label,
                'value' => $value,
            ];
        }

        return array_slice($items, 0, 8);
    }

    private function summary(string $title, int $rowCount, array $keyNumbers): string
    {
        if ($keyNumbers === []) {
            return "{$title} contains {$rowCount} rows for the selected filters. No totals were available in the current report payload.";
        }

        $first = $keyNumbers[0]['label'] ?? 'primary total';
        $value = $keyNumbers[0]['value'] ?? null;

        return "{$title} contains {$rowCount} rows for the selected filters. The main figure shown is {$first}: {$value}.";
    }

    private function observations(array $context): array
    {
        $rows = $context['rows'] ?? [];
        $filters = $context['filters'] ?? [];
        $observations = [];

        if ($filters !== []) {
            $observations[] = 'The summary reflects the filters currently applied on the report page.';
        }

        if (count($rows) > 0) {
            $first = $rows[0];
            if (is_array($first)) {
                $observations[] = 'The first displayed rows were included to give the summary row-level context.';
            }
        }

        return $observations ?: ['No row-level observations were available from the current report payload.'];
    }
}
