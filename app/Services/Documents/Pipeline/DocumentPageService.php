<?php

declare(strict_types=1);

namespace App\Services\Documents\Pipeline;

use Illuminate\Support\Facades\Log;
use Smalot\PdfParser\Parser;
use Throwable;

/**
 * Reads page structure and native text out of a PDF.
 *
 * Two jobs:
 *
 *  1. Report the real page count, so attempt history stops guessing.
 *  2. Pull the embedded text layer when one exists. A digitally generated
 *     invoice already contains its own text — sending it through vision costs
 *     tokens and introduces transcription errors for data that can be read
 *     exactly. Vision stays for scans, which genuinely need it.
 *
 * Pure PHP: no imagick, no shelling out, so it works on shared hosting.
 */
final class DocumentPageService
{
    /**
     * Below this many characters per page, a PDF is treated as scanned.
     * Digital documents carry far more; a scan usually yields near zero, with
     * occasional stray characters from an OCR layer or a stamp.
     */
    private const MIN_CHARS_PER_PAGE = 80;

    /** Guard against a PDF bomb declaring an enormous page count. */
    private const MAX_PAGES = 200;

    public function analyze(string $binary): DocumentPageAnalysis
    {
        try {
            $document = (new Parser())->parseContent($binary);
            $pages = $document->getPages();
        } catch (Throwable $e) {
            // Encrypted or malformed PDFs land here. The caller falls back to
            // vision rather than failing the whole scan.
            Log::info('PDF structure could not be read; falling back to image extraction.', [
                'reason' => mb_substr($e->getMessage(), 0, 200),
            ]);

            return DocumentPageAnalysis::unreadable(
                str_contains(strtolower($e->getMessage()), 'secured')
                || str_contains(strtolower($e->getMessage()), 'encrypt'),
            );
        }

        $pageCount = count($pages);

        if ($pageCount === 0) {
            return DocumentPageAnalysis::unreadable(false);
        }

        $truncated = $pageCount > self::MAX_PAGES;
        $pages = $truncated ? array_slice($pages, 0, self::MAX_PAGES) : $pages;

        $texts = [];

        foreach ($pages as $index => $page) {
            try {
                $texts[] = trim($page->getText());
            } catch (Throwable) {
                // One unreadable page must not lose the rest of the document.
                $texts[] = '';
            }
        }

        $total = array_sum(array_map('mb_strlen', $texts));
        $hasTextLayer = $total >= self::MIN_CHARS_PER_PAGE * max(1, count($texts));

        return new DocumentPageAnalysis(
            pageCount: $pageCount,
            pageTexts: $texts,
            hasTextLayer: $hasTextLayer,
            truncated: $truncated,
            encrypted: false,
            readable: true,
        );
    }
}
