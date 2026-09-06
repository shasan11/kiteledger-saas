<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

use App\Services\AI\Copilot\Tools\CopilotToolResult;
use App\Support\Money\CurrencyFormatter;
use Illuminate\Support\Str;

/**
 * Turns a verified tool result into a user-facing answer.
 *
 * The figures here come straight from the deterministic result - this class
 * formats and labels, it never computes. Anything the model contributes is
 * narration layered on top of numbers that are already fixed.
 */
final class CopilotResponseComposer
{
    public function __construct(private readonly CurrencyFormatter $currency) {}

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
            currencyDisplay: $result->currency !== null
                ? $this->currency->info($result->currency)->toArray()
                : null,
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

            $money = is_numeric($value) && $result->currency !== null && $this->isMoney((string) $key);

            $cards[] = array_filter([
                'label' => Str::headline((string) $key),
                'value' => $value,
                'currency' => is_numeric($value) ? $result->currency : null,
                'format' => is_numeric($value) ? ($money ? 'money' : 'number') : null,
                // The rendered string travels with the raw value so the client
                // never has to guess a symbol or a decimal count.
                'formatted' => $this->display($result, (string) $key, $value, $money),
            ], static fn ($v) => $v !== null);
        }

        return $cards;
    }

    /**
     * Prefers the string the executor already rendered; falls back to
     * formatting here so a result built elsewhere (a test, a future tool) is
     * still shown with its currency.
     */
    private function display(CopilotToolResult $result, string $key, mixed $value, bool $money): ?string
    {
        if (isset($result->displayMetrics[$key])) {
            return $result->displayMetrics[$key];
        }

        if (! is_numeric($value)) {
            return null;
        }

        return $money
            ? $this->currency->format($value, $result->currency)
            : $this->currency->plain($value);
    }

    /**
     * On a currency-bearing result every figure is money unless its key says
     * otherwise, because a tool that returns balances also returns the odd
     * invoice count alongside them.
     */
    private function isMoney(string $key): bool
    {
        $key = strtolower($key);

        foreach (['count', 'quantity', 'qty', 'days', 'percent', 'ratio', 'number_of', 'units'] as $hint) {
            if (str_contains($key, $hint)) {
                return false;
            }
        }

        return true;
    }

    /** @return array<int, array<string, mixed>> */
    private function tables(CopilotToolResult $result): array
    {
        if ($result->rows === []) {
            return [];
        }

        $columns = array_keys($result->rows[0]);

        // A column is money when its own name says so - "balance", "amount" -
        // never merely because the result carries a currency, since these rows
        // also hold names, dates and document numbers.
        return [[
            'title' => 'Details',
            'columns' => array_map(fn ($c) => array_filter([
                'key' => $c,
                'label' => Str::headline((string) $c),
                'format' => $result->currency !== null && CurrencyFormatter::looksMonetary((string) $c)
                    ? 'money'
                    : null,
            ], static fn ($v) => $v !== null), $columns),
            'rows' => $result->rows,
            'currency' => $result->currency,
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
                if (! is_scalar($value)) {
                    continue;
                }

                $money = is_numeric($value) && $result->currency !== null && $this->isMoney((string) $key);

                $parts[] = Str::headline((string) $key).': '
                    .($this->display($result, (string) $key, $value, $money) ?? $value);
            }

            if ($parts !== []) {
                return $metricLabel.'-'.implode(', ', $parts).'.';
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
