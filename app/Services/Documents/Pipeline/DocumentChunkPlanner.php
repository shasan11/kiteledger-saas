<?php

declare(strict_types=1);

namespace App\Services\Documents\Pipeline;

/**
 * Splits a long document into page groups that each fit one model request.
 *
 * The behaviour being replaced is a plain `mb_substr` at a character limit: a
 * fifty-page bank statement was cut mid-page and the remainder was never read
 * or mentioned. The user saw a completed scan listing the first few weeks of
 * transactions and no indication that a month was missing — which is how an
 * incomplete reconciliation gets approved.
 *
 * Chunks break on page boundaries only. Splitting inside a page would cut a
 * table between its header and its rows, or a line item between its
 * description and its amount, and the two halves would be extracted as
 * unrelated fragments.
 */
final class DocumentChunkPlanner
{
    /** Hard floor so a pathological limit cannot produce one chunk per page. */
    private const MIN_CHUNK_CHARS = 4000;

    /**
     * Plans the requests needed to read every page with usable text.
     *
     * A single page larger than the budget still becomes its own chunk rather
     * than being dropped: it is truncated at the model's own limit, which is
     * recorded, instead of vanishing.
     *
     * @param  DocumentPage[]  $pages
     * @return DocumentChunk[]
     */
    public function plan(array $pages, int $budgetChars): array
    {
        $budget = max(self::MIN_CHUNK_CHARS, $budgetChars);

        $chunks = [];
        $currentPages = [];
        $currentParts = [];
        $currentLength = 0;

        foreach ($pages as $page) {
            if (! $page->hasUsableText()) {
                continue;
            }

            $part = '--- PAGE '.$page->number." ---\n".$page->text;
            $length = mb_strlen($part);

            // Close the current chunk before it would exceed the budget, but
            // never emit an empty one.
            if ($currentParts !== [] && $currentLength + $length > $budget) {
                $chunks[] = new DocumentChunk(
                    index: count($chunks),
                    pageNumbers: $currentPages,
                    text: implode("\n\n", $currentParts),
                );

                $currentPages = [];
                $currentParts = [];
                $currentLength = 0;
            }

            $currentPages[] = $page->number;
            $currentParts[] = $part;
            $currentLength += $length;
        }

        if ($currentParts !== []) {
            $chunks[] = new DocumentChunk(
                index: count($chunks),
                pageNumbers: $currentPages,
                text: implode("\n\n", $currentParts),
            );
        }

        return $chunks;
    }
}
