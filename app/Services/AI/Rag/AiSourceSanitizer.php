<?php

namespace App\Services\AI\Rag;

use Illuminate\Support\Str;

class AiSourceSanitizer
{
    public function sanitize(array $candidates): array
    {
        return collect($candidates)
            ->filter(fn ($candidate) => ($candidate['final_score'] ?? 0) >= .30)
            ->map(function ($candidate, $index): array {
                $metadata = $candidate['metadata'] ?? [];
                $route = $candidate['route'] ?? $metadata['route'] ?? null;
                if ($route && $this->containsUuid($route)) {
                    $route = null;
                }

                return array_filter([
                    'key' => 'source-'.($index + 1),
                    'label' => $candidate['title'] ?? 'KiteLedger source',
                    'type' => $this->typeLabel($candidate['source_type'] ?? ''),
                    'module' => $candidate['module'] ?? null,
                    'route' => $route,
                    'snippet' => Str::limit($this->stripTechnical((string) ($candidate['content'] ?? '')), 280),
                    'status' => $metadata['status'] ?? null,
                    'date' => $metadata['date'] ?? null,
                    'match_label' => $this->matchLabel((float) ($candidate['final_score'] ?? 0)),
                ], fn ($value) => $value !== null && $value !== '');
            })->values()->all();
    }

    public function debug(array $candidates): array
    {
        return collect($candidates)->map(fn ($candidate) => [
            'source_type' => $candidate['source_type'] ?? null,
            'source_id' => $candidate['source_id'] ?? null,
            'scores' => array_intersect_key($candidate, array_flip([
                'exact_match_score', 'keyword_score', 'vector_score', 'metadata_score',
                'recency_score', 'source_quality_score', 'final_score',
            ])),
        ])->all();
    }

    private function matchLabel(float $score): string
    {
        return match (true) {
            $score >= .75 => 'High match',
            $score >= .50 => 'Good match',
            default => 'Possible match',
        };
    }

    private function typeLabel(string $type): string
    {
        return match ($type) {
            'app_help', 'route', 'workflow', 'documentation' => 'App Help',
            'report' => 'Report',
            default => Str::headline($type ?: 'Business Data'),
        };
    }

    public function containsUuid(string $value): bool
    {
        return (bool) preg_match('/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i', $value);
    }

    public function sanitizeText(string $value): string
    {
        // Older deterministic answers included database filters and internal
        // record routes in the prose. Strip those suffixes when returning both
        // new responses and saved conversation history.
        $value = preg_replace('/\s+Filters:\s+.*?(?=\s+Open:\s+|$)/is', '', $value);
        $value = preg_replace('/\s+Open:\s+\/\S+/i', '', (string) $value);
        $value = preg_replace('/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i', 'record', (string) $value);

        return trim((string) $value);
    }

    private function stripTechnical(string $value): string
    {
        $value = $this->sanitizeText($value);

        return Str::squish((string) $value);
    }
}
