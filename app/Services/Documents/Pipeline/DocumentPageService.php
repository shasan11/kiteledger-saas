<?php

declare(strict_types=1);

namespace App\Services\Documents\Pipeline;

use Illuminate\Support\Facades\Log;
use Smalot\PdfParser\Parser;
use Smalot\PdfParser\XObject\Image;
use Throwable;

/**
 * Reads page structure and native text out of a PDF.
 *
 * Two jobs:
 *
 *  1. Report the real page count, so attempt history stops guessing.
 *  2. Classify each page independently and pull its embedded text. A digitally
 *     generated invoice already contains its own text — sending it through
 *     vision costs tokens and introduces transcription errors for data that can
 *     be read exactly. Vision stays for scans, which genuinely need it.
 *
 * The classification is per page rather than per document. A single average
 * across the file marks a mixed PDF as "has text" and then loses every scanned
 * page's contents without a warning.
 *
 * Pure PHP: no imagick, no shelling out, so it works on shared hosting.
 */
final class DocumentPageService
{
    /**
     * At or above this many characters, a page is treated as digitally
     * generated. Real invoice pages carry several hundred to a few thousand.
     */
    private const NATIVE_TEXT_MIN_CHARS = 120;

    /**
     * Below this, a page is treated as blank rather than as a scan — a
     * separator or trailing page with a page number on it should not make the
     * whole document look like it needs vision.
     */
    private const EMPTY_MAX_CHARS = 12;

    /** Guard against a PDF bomb declaring an enormous page count. */
    private const MAX_PAGES = 200;

    public function analyze(string $binary): DocumentPageAnalysis
    {
        try {
            $document = (new Parser)->parseContent($binary);
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

        $analyzed = [];

        foreach (array_values($pages) as $index => $page) {
            $number = $index + 1;

            try {
                $text = trim($page->getText());
            } catch (Throwable) {
                // One unreadable page must not lose the rest of the document,
                // but it is recorded as unreadable rather than as blank so the
                // reviewer is told something is missing.
                $analyzed[] = new DocumentPage($number, PageKind::Unreadable);

                continue;
            }

            $analyzed[] = new DocumentPage(
                number: $number,
                kind: $this->classify($text, $this->hasImage($page)),
                text: $text,
                characterCount: mb_strlen($text),
            );
        }

        return new DocumentPageAnalysis(
            pageCount: $pageCount,
            pages: $analyzed,
            truncated: $truncated,
            encrypted: false,
            readable: true,
        );
    }

    /**
     * Classifies one page from its own text and whether it embeds an image.
     *
     * Text alone cannot separate a blank page from a scan — both yield nothing.
     * The presence of an image XObject is what distinguishes them, and getting
     * it wrong in the unsafe direction is exactly the failure being fixed: a
     * scan misread as blank loses its figures silently.
     *
     * The middle band matters too: a scan with an OCR header, or a form whose
     * printed labels are text while the filled-in values are part of the image,
     * yields some text but not enough to be trusted alone. Calling that "native
     * text" is what loses the numbers.
     */
    private function classify(string $text, bool $hasImage): PageKind
    {
        $length = mb_strlen($text);

        if ($length >= self::NATIVE_TEXT_MIN_CHARS) {
            // Plenty of text and no image: read it directly. Plenty of text
            // *and* an image usually means a logo, which vision adds nothing to.
            return PageKind::NativeText;
        }

        if ($length <= self::EMPTY_MAX_CHARS) {
            return $hasImage ? PageKind::ScannedImage : PageKind::Empty;
        }

        return PageKind::Mixed;
    }

    /**
     * Whether the page embeds an image.
     *
     * Failure is treated as "yes": if we cannot tell, routing the page through
     * vision costs tokens, whereas skipping it can drop an invoice total.
     */
    private function hasImage(mixed $page): bool
    {
        try {
            foreach ($page->getXObjects() as $xObject) {
                if ($xObject instanceof Image) {
                    return true;
                }
            }
        } catch (Throwable) {
            return true;
        }

        return false;
    }
}
