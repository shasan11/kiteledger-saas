<?php

declare(strict_types=1);

namespace App\Services\Documents\Matching;

/**
 * Shared name normalization and similarity for entity matchers.
 *
 * Extracted so supplier, product and account matching agree on what "the same
 * name" means. Three slightly different implementations would produce three
 * different answers for the same document.
 */
trait MatchesNames
{
    /** Words that carry no identifying value in a business name. */
    private const SHARED_NOISE = [
        'pvt', 'private', 'ltd', 'limited', 'llc', 'inc', 'incorporated',
        'co', 'company', 'corp', 'corporation', 'plc', 'gmbh', 'sa', 'bv',
        'and', '&', 'the',
    ];

    /**
     * Lowercases, strips punctuation and removes noise words.
     *
     * @param string[] $extraNoise domain-specific words to ignore
     */
    protected function normalizeName(?string $value, array $extraNoise = []): string
    {
        $value = strtolower(trim((string) $value));
        $value = preg_replace('/[^a-z0-9\s]/', ' ', $value) ?? '';

        $noise = array_merge(self::SHARED_NOISE, $extraNoise);

        $words = array_filter(
            preg_split('/\s+/', $value) ?: [],
            static fn ($w) => $w !== '' && ! in_array($w, $noise, true),
        );

        return implode(' ', $words);
    }

    /**
     * Similarity in 0..1.
     *
     * Containment is treated generously: "Blue Widget" inside "Blue Widget XL"
     * is a strong signal that character-level comparison understates.
     */
    protected function nameSimilarity(string $a, string $b): float
    {
        if ($a === '' || $b === '') {
            return 0.0;
        }

        if ($a === $b) {
            return 1.0;
        }

        if (str_contains($b, $a) || str_contains($a, $b)) {
            $shorter = min(strlen($a), strlen($b));
            $longer = max(strlen($a), strlen($b));

            return max(0.75, $shorter / $longer);
        }

        similar_text($a, $b, $percent);

        return $percent / 100;
    }

    protected function cleanValue(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    /** Case- and punctuation-insensitive comparison for codes and identifiers. */
    protected function codesMatch(?string $a, ?string $b): bool
    {
        if ($a === null || $b === null) {
            return false;
        }

        $normalize = static fn (string $v) => strtolower(preg_replace('/[^A-Za-z0-9]/', '', $v) ?? '');

        $left = $normalize($a);

        return $left !== '' && $left === $normalize($b);
    }
}
