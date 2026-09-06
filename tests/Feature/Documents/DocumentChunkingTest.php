<?php

declare(strict_types=1);

namespace Tests\Feature\Documents;

use App\Services\Documents\Pipeline\ChunkResultMerger;
use App\Services\Documents\Pipeline\DocumentChunk;
use App\Services\Documents\Pipeline\DocumentChunkPlanner;
use App\Services\Documents\Pipeline\DocumentPage;
use App\Services\Documents\Pipeline\PageKind;
use Tests\TestCase;

/**
 * Phase 3: a long document is read in page groups instead of being cut at a
 * character limit.
 *
 * The behaviour replaced was a plain substring: a fifty-page bank statement was
 * truncated mid-page and the remainder was never read or mentioned, so the user
 * saw a completed scan covering the first few weeks and no sign that a month
 * was missing.
 */
class DocumentChunkingTest extends TestCase
{
    /** @param array<int, string> $texts */
    private function pages(array $texts): array
    {
        return array_map(
            static fn (string $text, int $index) => new DocumentPage(
                $index + 1,
                trim($text) === '' ? PageKind::Empty : PageKind::NativeText,
                $text,
                mb_strlen($text),
            ),
            $texts,
            array_keys($texts),
        );
    }

    // ---------- Planning ----------

    public function test_a_short_document_is_a_single_request(): void
    {
        $chunks = app(DocumentChunkPlanner::class)->plan(
            $this->pages([str_repeat('a', 100), str_repeat('b', 100)]),
            60000,
        );

        $this->assertCount(1, $chunks);
        $this->assertSame([1, 2], $chunks[0]->pageNumbers);
    }

    public function test_a_long_document_is_split_into_page_groups(): void
    {
        // 50 pages of 3,000 characters against a 10,000 budget.
        $pages = $this->pages(array_fill(0, 50, str_repeat('x', 3000)));

        $chunks = app(DocumentChunkPlanner::class)->plan($pages, 10000);

        $this->assertGreaterThan(1, count($chunks));

        $covered = [];

        foreach ($chunks as $chunk) {
            $covered = array_merge($covered, $chunk->pageNumbers);
        }

        // Every page reaches exactly one chunk. A page appearing twice would be
        // extracted twice and its line items duplicated on merge.
        $this->assertSame(range(1, 50), $covered);
        $this->assertSame(count($covered), count(array_unique($covered)));
    }

    public function test_chunks_never_split_inside_a_page(): void
    {
        // Splitting mid-page cuts a table between its header and its rows, and
        // the halves are extracted as unrelated fragments.
        $pages = $this->pages(array_fill(0, 10, str_repeat('y', 5000)));

        foreach (app(DocumentChunkPlanner::class)->plan($pages, 8000) as $chunk) {
            foreach ($chunk->pageNumbers as $number) {
                $this->assertStringContainsString('--- PAGE '.$number.' ---', $chunk->text);
            }
        }
    }

    public function test_a_single_oversized_page_still_becomes_its_own_chunk(): void
    {
        $chunks = app(DocumentChunkPlanner::class)->plan(
            $this->pages([str_repeat('z', 500000)]),
            10000,
        );

        $this->assertCount(1, $chunks, 'An oversized page must be attempted, not dropped.');
        $this->assertSame([1], $chunks[0]->pageNumbers);
    }

    public function test_pages_with_no_usable_text_are_not_planned_as_text_chunks(): void
    {
        $chunks = app(DocumentChunkPlanner::class)->plan(
            $this->pages([str_repeat('a', 200), '', str_repeat('b', 200)]),
            60000,
        );

        $this->assertSame([1, 3], $chunks[0]->pageNumbers);
    }

    // ---------- Merging ----------

    /** @param array<string, mixed>|null $data */
    private function chunkResult(DocumentChunk $chunk, ?array $data): array
    {
        return ['chunk' => $chunk, 'data' => $data, 'error' => $data === null ? 'failed' : null];
    }

    public function test_line_items_are_concatenated_in_page_order(): void
    {
        $merged = app(ChunkResultMerger::class)->merge([
            $this->chunkResult(new DocumentChunk(0, [1, 2], ''), [
                'document_type' => 'bank_statement',
                'document_number' => 'ST-9001',
                'lines' => [['description' => 'first'], ['description' => 'second']],
            ]),
            $this->chunkResult(new DocumentChunk(1, [3, 4], ''), [
                'document_type' => 'bank_statement',
                'lines' => [['description' => 'third']],
            ]),
        ]);

        $this->assertSame(
            ['first', 'second', 'third'],
            array_column($merged->data['lines'], 'description'),
        );
        $this->assertTrue($merged->isComplete());
        $this->assertSame([1, 2, 3, 4], $merged->pagesProcessed);
    }

    public function test_header_fields_come_from_the_first_chunk_that_has_them(): void
    {
        $merged = app(ChunkResultMerger::class)->merge([
            $this->chunkResult(new DocumentChunk(0, [1], ''), [
                'document_type' => 'sales_invoice',
                'document_number' => 'INV-1',
                'party' => ['name' => 'ABC Trading'],
            ]),
            $this->chunkResult(new DocumentChunk(1, [2], ''), [
                'document_type' => 'sales_invoice',
                'document_number' => 'INV-2',
                'party' => ['name' => 'Different Co', 'tax_number' => 'TX-9'],
            ]),
        ]);

        // The header is printed on the first page; a later chunk re-reading a
        // running footer must not overwrite it.
        $this->assertSame('INV-1', $merged->data['document_number']);
        $this->assertSame('ABC Trading', $merged->data['party']['name']);
        // A field the first chunk did not have is still picked up.
        $this->assertSame('TX-9', $merged->data['party']['tax_number']);
    }

    public function test_totals_come_from_the_last_chunk_that_states_them(): void
    {
        $merged = app(ChunkResultMerger::class)->merge([
            $this->chunkResult(new DocumentChunk(0, [1], ''), [
                'document_type' => 'sales_invoice',
                'totals' => ['subtotal' => 100, 'grand_total' => null],
            ]),
            $this->chunkResult(new DocumentChunk(1, [2], ''), [
                'document_type' => 'sales_invoice',
                'totals' => ['subtotal' => 900, 'grand_total' => 990],
            ]),
        ]);

        // A totals block is printed at the end of the document.
        $this->assertSame(990, $merged->data['totals']['grand_total']);
    }

    public function test_totals_are_never_summed_across_chunks(): void
    {
        $merged = app(ChunkResultMerger::class)->merge([
            $this->chunkResult(new DocumentChunk(0, [1], ''), [
                'document_type' => 'sales_invoice',
                'totals' => ['grand_total' => 500],
            ]),
            $this->chunkResult(new DocumentChunk(1, [2], ''), [
                'document_type' => 'sales_invoice',
                'totals' => ['grand_total' => 500],
            ]),
        ]);

        // Adding these would report a 1,000 total for a 500 invoice whose
        // footer simply repeats on both pages.
        $this->assertSame(500, $merged->data['totals']['grand_total']);
    }

    public function test_a_failed_chunk_reports_its_pages_instead_of_failing_silently(): void
    {
        $merged = app(ChunkResultMerger::class)->merge(
            [
                $this->chunkResult(new DocumentChunk(0, [1, 2], ''), [
                    'document_type' => 'bank_statement',
                    'lines' => [['description' => 'read ok']],
                ]),
                $this->chunkResult(new DocumentChunk(1, [3, 4], ''), null),
            ],
            [1, 2, 3, 4],
        );

        $this->assertFalse($merged->isComplete());
        $this->assertSame([3, 4], $merged->pagesFailed);
        $this->assertSame([1, 2], $merged->pagesProcessed);
        $this->assertNotEmpty($merged->warnings);

        // The pages that did work are still returned.
        $this->assertCount(1, $merged->data['lines']);
    }

    public function test_journal_lines_are_appended_across_chunks(): void
    {
        $merged = app(ChunkResultMerger::class)->merge([
            $this->chunkResult(new DocumentChunk(0, [1], ''), [
                'document_type' => 'journal_voucher',
                'journal_entry' => ['narration' => 'Month end', 'lines' => [['account_name' => 'Cash', 'debit' => 100]]],
            ]),
            $this->chunkResult(new DocumentChunk(1, [2], ''), [
                'document_type' => 'journal_voucher',
                'journal_entry' => ['lines' => [['account_name' => 'Sales', 'credit' => 100]]],
            ]),
        ]);

        $this->assertCount(2, $merged->data['journal_entry']['lines']);
        $this->assertSame('Month end', $merged->data['journal_entry']['narration']);
    }

    public function test_coverage_is_reported_for_the_review_screen(): void
    {
        $coverage = app(ChunkResultMerger::class)->merge(
            [$this->chunkResult(new DocumentChunk(0, [1], ''), ['document_type' => 'other', 'lines' => []])],
            [1, 2, 3],
        )->coverage();

        $this->assertSame([1], $coverage['pages_processed']);
        $this->assertSame([2, 3], $coverage['pages_omitted']);
        $this->assertFalse($coverage['complete']);
    }
}
