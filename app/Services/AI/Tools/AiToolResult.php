<?php

namespace App\Services\AI\Tools;

class AiToolResult
{
    public function __construct(private array $payload)
    {
    }

    public static function query(string $tool, string $title, array $records, array $filters = [], ?string $summary = null, ?string $openUrl = null): self
    {
        return new self(array_filter([
            'type' => 'query_result',
            'tool' => $tool,
            'title' => $title,
            'summary' => $summary ?? self::summaryFromRecords($title, $records),
            'records' => array_values($records),
            'filters' => $filters,
            'source' => 'database',
            'open_url' => $openUrl,
        ], fn ($value) => $value !== null));
    }

    public static function report(string $key, string $title, array $filters, string $openUrl): self
    {
        return new self([
            'type' => 'report',
            'report_key' => $key,
            'title' => $title,
            'filters' => $filters,
            'open_url' => $openUrl,
            'source' => 'report_router',
        ]);
    }

    public static function empty(string $tool, string $title, array $filters = [], string $summary = 'No data was found.'): self
    {
        return self::query($tool, $title, [], $filters, $summary);
    }

    public function toArray(): array
    {
        return $this->payload;
    }

    public function summary(): string
    {
        return (string) ($this->payload['summary'] ?? 'I found the requested result.');
    }

    private static function summaryFromRecords(string $title, array $records): string
    {
        if (empty($records)) {
            return 'No data was found for ' . mb_strtolower($title) . '.';
        }

        return $title . ' returned ' . count($records) . ' record' . (count($records) === 1 ? '' : 's') . '.';
    }
}
