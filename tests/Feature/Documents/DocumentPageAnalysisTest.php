<?php

declare(strict_types=1);

namespace Tests\Feature\Documents;

use App\Services\Documents\Pipeline\DocumentPage;
use App\Services\Documents\Pipeline\DocumentPageAnalysis;
use App\Services\Documents\Pipeline\DocumentPageService;
use App\Services\Documents\Pipeline\PageKind;
use Tests\TestCase;

/**
 * Multi-page handling: real page counts, native text preferred over vision,
 * and page boundaries preserved.
 */
class DocumentPageAnalysisTest extends TestCase
{
    /**
     * Minimal but valid multi-page PDF with an embedded text layer, built
     * inline so the test needs no binary fixture.
     */
    private function pdf(array $pageTexts): string
    {
        $objects = [];
        $pageIds = [];
        $next = 3;

        foreach ($pageTexts as $text) {
            $contentId = $next++;
            $pageId = $next++;
            $pageIds[] = $pageId;

            $stream = "BT /F1 12 Tf 72 720 Td (".str_replace(['(', ')'], '', $text).") Tj ET";

            $objects[$contentId] = "<< /Length ".strlen($stream)." >>\nstream\n{$stream}\nendstream";
            $objects[$pageId] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
                ."/Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> "
                ."/Contents {$contentId} 0 R >>";
        }

        $kids = implode(' ', array_map(static fn ($id) => "{$id} 0 R", $pageIds));

        $objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
        $objects[2] = '<< /Type /Pages /Kids ['.$kids.'] /Count '.count($pageIds).' >>';

        ksort($objects);

        $pdf = "%PDF-1.4\n";
        $offsets = [];

        foreach ($objects as $id => $body) {
            $offsets[$id] = strlen($pdf);
            $pdf .= "{$id} 0 obj\n{$body}\nendobj\n";
        }

        $xrefPos = strlen($pdf);
        $max = max(array_keys($objects)) + 1;

        $pdf .= "xref\n0 {$max}\n0000000000 65535 f \n";

        for ($i = 1; $i < $max; $i++) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$i] ?? 0);
        }

        $pdf .= "trailer\n<< /Size {$max} /Root 1 0 R >>\nstartxref\n{$xrefPos}\n%%EOF";

        return $pdf;
    }

    public function test_page_count_is_read_from_the_document_not_guessed(): void
    {
        $analysis = app(DocumentPageService::class)->analyze(
            $this->pdf(['Invoice page one', 'Continuation page two', 'Totals page three']),
        );

        $this->assertTrue($analysis->readable);
        $this->assertSame(3, $analysis->pageCount);
    }

    public function test_a_text_layer_is_detected_and_preferred_over_vision(): void
    {
        $longText = str_repeat('Invoice number INV-1042 total 220 supplier ABC Trading. ', 4);

        $analysis = app(DocumentPageService::class)->analyze($this->pdf([$longText]));

        $this->assertSame(PageKind::NativeText, $analysis->pages[0]->kind);
        $this->assertTrue($analysis->canUseNativeText(), 'A digital PDF should not need vision.');
        $this->assertStringContainsString('INV-1042', $analysis->toPromptText(60000));
    }

    /**
     * Builds an analysis directly.
     *
     * The mixed-document rule is asserted here rather than through a synthetic
     * PDF because a scanned page is defined by carrying an image with no text,
     * and the inline PDF builder above embeds no images — every low-text page it
     * produces is genuinely blank, which is a different case.
     *
     * @param  array<int, array{0: PageKind, 1: string}>  $pages
     */
    private function analysisOf(array $pages): DocumentPageAnalysis
    {
        return new DocumentPageAnalysis(
            pageCount: count($pages),
            pages: array_map(
                static fn (array $page, int $index) => new DocumentPage(
                    $index + 1,
                    $page[0],
                    $page[1],
                    mb_strlen($page[1]),
                ),
                $pages,
                array_keys($pages),
            ),
            readable: true,
        );
    }

    public function test_a_mixed_pdf_does_not_pass_as_fully_digital(): void
    {
        /*
         * The regression this pins: text density was averaged across the whole
         * document, so a file whose first pages are digital and whose last
         * pages are scans passed the check collectively. The scanned pages were
         * then sent to the model as blank and their figures disappeared from
         * the extraction with no warning at all.
         */
        $analysis = $this->analysisOf([
            [PageKind::NativeText, str_repeat('Digital invoice content. ', 20)],
            [PageKind::NativeText, str_repeat('More digital content. ', 20)],
            [PageKind::NativeText, str_repeat('Yet more digital content. ', 20)],
            [PageKind::ScannedImage, ''],
            [PageKind::ScannedImage, ''],
        ]);

        $this->assertFalse(
            $analysis->canUseNativeText(),
            'One scanned page must stop the whole document being treated as digital.',
        );
        $this->assertTrue($analysis->isMixed());
        $this->assertCount(2, $analysis->pagesNeedingVision());
        $this->assertCount(3, $analysis->pagesWithText());
    }

    public function test_a_mixed_pdf_warns_the_reviewer_about_the_scanned_pages(): void
    {
        $warnings = $this->analysisOf([
            [PageKind::NativeText, str_repeat('Digital invoice content. ', 20)],
            [PageKind::ScannedImage, ''],
            [PageKind::ScannedImage, ''],
        ])->warnings();

        $this->assertNotEmpty($warnings);
        $this->assertStringContainsString('2 pages', $warnings[0]);
        $this->assertStringContainsString('scans', $warnings[0]);
    }

    public function test_blank_trailing_pages_do_not_force_the_whole_document_to_vision(): void
    {
        // A separator page with a page number on it is not a scan, and treating
        // it as one would send every such document through vision needlessly.
        $analysis = $this->analysisOf([
            [PageKind::NativeText, str_repeat('Digital invoice content. ', 20)],
            [PageKind::Empty, ''],
        ]);

        $this->assertTrue($analysis->canUseNativeText());
        $this->assertFalse($analysis->isMixed());
        $this->assertSame([], $analysis->warnings());
    }

    public function test_an_unreadable_page_is_reported_not_silently_dropped(): void
    {
        $warnings = $this->analysisOf([
            [PageKind::NativeText, str_repeat('Digital invoice content. ', 20)],
            [PageKind::Unreadable, ''],
        ])->warnings();

        $this->assertNotEmpty(array_filter(
            $warnings,
            static fn (string $w): bool => str_contains($w, 'could not be read'),
        ));
    }

    public function test_each_page_is_classified_on_its_own_content(): void
    {
        $long = str_repeat('Fully digital page content with plenty of characters. ', 6);
        $medium = 'Short header only text';

        $analysis = app(DocumentPageService::class)->analyze($this->pdf([$long, $medium]));

        $this->assertSame(PageKind::NativeText, $analysis->pages[0]->kind);
        $this->assertSame(PageKind::Mixed, $analysis->pages[1]->kind);
        $this->assertSame(1, $analysis->pages[0]->number, 'Page numbers are 1-based.');
        $this->assertSame(2, $analysis->pages[1]->number);
    }

    public function test_pages_needing_vision_are_announced_rather_than_omitted(): void
    {
        $long = str_repeat('Digital page content with plenty of characters here. ', 6);

        $analysis = app(DocumentPageService::class)->analyze($this->pdf([$long, 'Short header only']));

        $prompt = $analysis->toPromptText(60000);

        // A silent gap reads to the model as "this page had nothing on it".
        $this->assertStringContainsString('--- PAGE 2 ---', $prompt);
    }

    public function test_page_boundaries_are_preserved_in_the_prompt(): void
    {
        $analysis = app(DocumentPageService::class)->analyze(
            $this->pdf([
                str_repeat('First page content here. ', 6),
                str_repeat('Second page content here. ', 6),
            ]),
        );

        $prompt = $analysis->toPromptText(60000);

        // Without explicit boundaries a total on page 2 could be attributed to
        // page 1, and evidence could cite the wrong page.
        $this->assertStringContainsString('--- PAGE 1 ---', $prompt);
        $this->assertStringContainsString('--- PAGE 2 ---', $prompt);
        $this->assertLessThan(
            strpos($prompt, '--- PAGE 2 ---'),
            strpos($prompt, '--- PAGE 1 ---'),
            'Pages must stay in order.',
        );
    }

    public function test_a_scanned_pdf_without_text_falls_back_to_vision(): void
    {
        // Near-empty text layer, as a scan produces.
        $analysis = app(DocumentPageService::class)->analyze($this->pdf(['x']));

        $this->assertTrue($analysis->readable);
        $this->assertFalse($analysis->canUseNativeText());
    }

    public function test_an_unreadable_pdf_degrades_instead_of_failing(): void
    {
        $analysis = app(DocumentPageService::class)->analyze('not a pdf at all');

        $this->assertFalse($analysis->readable);
        $this->assertFalse($analysis->canUseNativeText());
        $this->assertSame(0, $analysis->pageCount);
    }

    public function test_prompt_text_respects_the_character_budget(): void
    {
        $analysis = app(DocumentPageService::class)->analyze(
            $this->pdf([str_repeat('Long content. ', 50)]),
        );

        $this->assertLessThanOrEqual(120, mb_strlen($analysis->toPromptText(120)));
    }

    public function test_truncated_documents_warn_the_reviewer(): void
    {
        $truncated = new DocumentPageAnalysis(
            pageCount: 500,
            pages: [new DocumentPage(1, PageKind::NativeText, 'a', 1)],
            truncated: true,
            readable: true,
        );

        $this->assertNotEmpty($truncated->warnings());
        $this->assertStringContainsString('not included', $truncated->warnings()[0]);
    }
}
