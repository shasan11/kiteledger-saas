<?php

declare(strict_types=1);

namespace App\Services\Documents\Pipeline;

/**
 * Deterministically merges per-chunk extractions into one document.
 *
 * No model is involved in the merge. Asking one to reconcile several partial
 * JSON payloads invites it to smooth over the disagreements — which is exactly
 * where a wrong total comes from. The rules here are mechanical and stated:
 *
 *  - Scalar header fields (document number, dates, party) come from the first
 *    chunk that supplies them, because they appear on the first page.
 *  - Repeating arrays (line items, journal lines, transactions) are
 *    concatenated in page order.
 *  - Totals come from the *last* chunk that supplies them, because a document's
 *    totals block is printed at the end.
 *  - Nothing is summed across chunks. A merged total is a derived figure, and
 *    the normalizer already handles derivation with an explicit origin.
 */
final class ChunkResultMerger
{
    /** Header fields taken from the earliest chunk that has them. */
    private const HEADER_KEYS = [
        'document_type',
        'document_number',
        'document_date',
        'due_date',
        'currency_code',
        'language',
        'terms_and_conditions',
    ];

    /** Nested objects merged key-by-key, first non-null wins. */
    private const HEADER_OBJECTS = ['party', 'counterparty', 'payment', 'inventory'];

    /** Arrays concatenated across chunks in page order. */
    private const APPENDED_ARRAYS = ['lines', 'transactions', 'warnings', 'missing_fields'];

    /** Blocks taken from the last chunk that supplies them. */
    private const TRAILING_OBJECTS = ['totals'];

    /**
     * @param  array<int, array{chunk: DocumentChunk, data: array<string, mixed>|null, error: string|null}>  $results
     * @param  int[]  $pagesNotSent  pages excluded before extraction began
     */
    public function merge(array $results, array $pagesNotSent = []): ChunkMergeResult
    {
        $merged = [];
        $processed = [];
        $failed = [];
        $warnings = [];
        $journalLines = [];

        foreach ($results as $result) {
            $chunk = $result['chunk'];

            if (! is_array($result['data'] ?? null)) {
                $failed = array_merge($failed, $chunk->pageNumbers);
                $warnings[] = 'KiteLedger could not read '.$chunk->label().' of this document.';

                continue;
            }

            $data = $result['data'];
            $processed = array_merge($processed, $chunk->pageNumbers);

            foreach (self::HEADER_KEYS as $key) {
                if (! isset($merged[$key]) && filled($data[$key] ?? null)) {
                    $merged[$key] = $data[$key];
                }
            }

            foreach (self::HEADER_OBJECTS as $key) {
                if (! is_array($data[$key] ?? null)) {
                    continue;
                }

                $merged[$key] ??= [];

                foreach ($data[$key] as $field => $value) {
                    if (! filled($merged[$key][$field] ?? null) && filled($value)) {
                        $merged[$key][$field] = $value;
                    }
                }
            }

            foreach (self::APPENDED_ARRAYS as $key) {
                if (! is_array($data[$key] ?? null)) {
                    continue;
                }

                $merged[$key] = array_merge($merged[$key] ?? [], array_values($data[$key]));
            }

            // Journal lines live one level down and are appended the same way.
            if (is_array($data['journal_entry']['lines'] ?? null)) {
                $journalLines = array_merge($journalLines, array_values($data['journal_entry']['lines']));
            }

            if (filled($data['journal_entry']['narration'] ?? null)
                && ! filled($merged['journal_entry']['narration'] ?? null)) {
                $merged['journal_entry']['narration'] = $data['journal_entry']['narration'];
            }

            foreach (self::TRAILING_OBJECTS as $key) {
                if (is_array($data[$key] ?? null) && array_filter($data[$key], 'filled') !== []) {
                    $merged[$key] = $data[$key];
                }
            }

            // Per-field confidence and evidence merge by key; later chunks do
            // not overwrite an earlier chunk's citation for the same field.
            foreach (['field_confidence', 'evidence'] as $key) {
                if (! is_array($data[$key] ?? null)) {
                    continue;
                }

                $merged[$key] = ($merged[$key] ?? []) + $data[$key];
            }
        }

        if ($journalLines !== []) {
            $merged['journal_entry']['lines'] = $journalLines;
        }

        $merged['document_type'] ??= 'other';
        $merged['warnings'] = array_values(array_unique(array_merge(
            array_filter($merged['warnings'] ?? [], 'is_string'),
            $warnings,
        )));

        sort($processed);
        sort($failed);
        $omitted = array_values(array_diff($pagesNotSent, $processed));
        sort($omitted);

        return new ChunkMergeResult(
            data: $merged,
            pagesProcessed: array_values(array_unique($processed)),
            pagesFailed: array_values(array_unique($failed)),
            pagesOmitted: $omitted,
            warnings: $warnings,
            chunkCount: count($results),
        );
    }
}
