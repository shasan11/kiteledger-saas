<?php

declare(strict_types=1);

namespace App\Services\Documents\Pipeline;

use App\Services\Documents\Contracts\FieldEvidence;

/**
 * Establishes, deterministically, which page a value came from.
 *
 * Models are unreliable narrators about their own sources: asked for a page
 * number they will supply a plausible one whether or not they tracked it. When
 * the document's own text layer is available, the page a value appears on is a
 * fact we can check rather than a claim we have to trust — so the extracted
 * value is searched for in the page texts, and a citation is only issued when
 * it is actually found there.
 *
 * A value that cannot be located keeps whatever the model offered, but the
 * caller can tell the two apart: a verified citation carries text from the page
 * itself.
 */
final class FieldProvenanceResolver
{
    /** Values shorter than this match too many pages to be worth citing. */
    private const MIN_SEARCHABLE_LENGTH = 3;

    /** Characters of surrounding text kept as the evidence snippet. */
    private const SNIPPET_RADIUS = 60;

    /**
     * @param  DocumentPage[]  $pages
     */
    public function resolve(mixed $value, array $pages): ?FieldEvidence
    {
        $needle = $this->searchable($value);

        if ($needle === null || $pages === []) {
            return null;
        }

        foreach ($pages as $page) {
            if (! $page->hasUsableText()) {
                continue;
            }

            $haystack = $this->normalize($page->text);
            $position = mb_strpos($haystack, $needle);

            if ($position === false) {
                continue;
            }

            return new FieldEvidence(
                page: $page->number,
                text: $this->snippet($page->text, $haystack, $position, mb_strlen($needle)),
                // No bounding box: the text layer gives no geometry, and an
                // invented rectangle would highlight the wrong part of the page.
                boundingBox: null,
            );
        }

        return null;
    }

    /**
     * A comparable form of the value.
     *
     * Amounts are matched on their digits so "1,234.50" on the page still
     * matches 1234.5 in the extraction; without this, every numeric field would
     * fail to locate itself.
     */
    private function searchable(mixed $value): ?string
    {
        if (is_bool($value) || $value === null) {
            return null;
        }

        if (is_int($value) || is_float($value)) {
            $formatted = rtrim(rtrim(number_format((float) $value, 2, '.', ''), '0'), '.');

            return $formatted === '' ? null : $formatted;
        }

        $text = $this->normalize(trim((string) $value));

        return mb_strlen($text) >= self::MIN_SEARCHABLE_LENGTH ? $text : null;
    }

    /** Strips thousands separators and collapses whitespace so both sides compare alike. */
    private function normalize(string $text): string
    {
        $text = str_replace(["\u{00A0}", ','], ['', ''], $text);

        return mb_strtolower((string) preg_replace('/\s+/', ' ', $text));
    }

    /**
     * A snippet of the page around the match.
     *
     * Taken from the normalized haystack so the offset stays valid — indexing
     * the original text with a position found in the normalized copy would cut
     * the snippet at the wrong place.
     */
    private function snippet(string $original, string $haystack, int $position, int $length): string
    {
        $start = max(0, $position - self::SNIPPET_RADIUS);
        $width = $length + (self::SNIPPET_RADIUS * 2);

        return trim(mb_substr($haystack, $start, $width));
    }
}
