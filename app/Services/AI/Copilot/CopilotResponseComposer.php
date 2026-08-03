<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

use App\Services\AI\Copilot\Tools\CopilotToolResult;
use Illuminate\Support\Str;

/**
 * Turns a verified tool result into a user-facing answer.
 *
 * The figures here come straight from the deterministic result — this class
 * formats and labels, it never computes. Anything the model contributes is
 * narration layered on top of numbers that are already fixed.
 */
final class CopilotResponseComposer
{
    public function fromToolResult(
        CopilotToolResult $result,
        CopilotRoutingDecision $decision,
        string $metricLabel,
        ?string $narration = null,
    ): CopilotResponse {
        $cards = $this->cards($result);
        $tables = $this->tables($result);
        $headline = $this->headline($result, $metricLabel);

        $body = $narration !== null && trim($narration) !== ''
            ? trim($narration)
            : $this->fallbackBody($result, $metricLabel);

        return new CopilotResponse(
            type: CopilotResponseType::VerifiedToolAnswer,
            message: $body,
            sourcePolicy: $decision->sourcePolicy,
            answer: [
                'headline' => $headline,
                'body' => $body,
                'bullets' => [],
                'limitations' => $result->limitations,
                'confidence' => 'high',
                'confidence_label' => 'Verified from your data',
            ],
            cards: $cards,
            tables: $tables,
            warnings: $result->limitations,
            followups: $this->followups($decision),
            toolsUsed: [$result->tool],
            filters: $result->appliedFilters,
            currency: $result->currency,
            branchScopeLabel: $result->branchScope,
            asOf: $result->asOf,
            verified: $result->verified,
        );
    }

    /** @return array<int, array<string, mixed>> */
    private function cards(CopilotToolResult $result): array
    {
        $cards = [];

        foreach ($result->metrics as $key => $value) {
            if (! is_scalar($value)) {
                continue;
            }

            $cards[] = array_filter([
                'label' => Str::headline((string) $key),
                'value' => $value,
                'currency' => is_numeric($value) ? $result->currency : null,
            ], static fn ($v) => $v !== null);
        }

        return $cards;
    }

    /** @return array<int, array<string, mixed>> */
    private function tables(CopilotToolResult $result): array
    {
        if ($result->rows === []) {
            return [];
        }

        $columns = array_keys($result->rows[0]);

        return [[
            'title' => 'Details',
            'columns' => array_map(static fn ($c) => [
                'key' => $c,
                'label' => Str::headline((string) $c),
            ], $columns),
            'rows' => $result->rows,
        ]];
    }

    private function headline(CopilotToolResult $result, string $metricLabel): string
    {
        $period = $result->dateFrom && $result->dateTo
            ? " ({$result->dateFrom} to {$result->dateTo})"
            : '';

        return $metricLabel.$period;
    }

    /**
     * Used when the model produced no narration. Deliberately terse and factual
     * rather than an invented explanation.
     */
    private function fallbackBody(CopilotToolResult $result, string $metricLabel): string
    {
        // The query service's own summary already states the computed figure.
        if ($result->summary !== null && trim($result->summary) !== '') {
            return trim($result->summary);
        }

        if ($result->metrics !== []) {
            $parts = [];

            foreach ($result->metrics as $key => $value) {
                if (is_scalar($value)) {
                    $parts[] = Str::headline((string) $key).': '
                        .($result->currency ? $result->currency.' ' : '').$value;
                }
            }

            if ($parts !== []) {
                return $metricLabel.' — '.implode(', ', $parts).'.';
            }
        }

        $count = count($result->rows);

        return $count > 0
            ? "{$metricLabel}: {$count} matching ".Str::plural('record', $count).'.'
            : "{$metricLabel}: no matching records for the selected filters.";
    }

    /** @return array<int, string> */
    private function followups(CopilotRoutingDecision $decision): array
    {
        if (! isset($decision->filters['date_range'])) {
            return [];
        }

        return isset($decision->filters['comparison_range'])
            ? []
            : ['Compare this with the previous period.'];
    }
}
