<?php

declare(strict_types=1);

namespace App\Services\Documents\Pipeline;

/**
 * What could be learned about a PDF's structure before extraction.
 *
 * The document-wide "does this have a text layer" question has been replaced by
 * a per-page classification. Averaging character density across a document
 * silently discards the scanned half of a mixed PDF: the pages pass the
 * threshold collectively, are treated as text, and contribute nothing — so an
 * invoice total printed on a scanned page disappears with no warning at all.
 */
final readonly class DocumentPageAnalysis
{
    /**
     * @param  DocumentPage[]  $pages  analyzed pages, in page order
     */
    public function __construct(
        public int $pageCount = 0,
        public array $pages = [],
        public bool $truncated = false,
        public bool $encrypted = false,
        public bool $readable = false,
    ) {}

    /** Structure could not be read; the caller should fall back to vision. */
    public static function unreadable(bool $encrypted): self
    {
        return new self(encrypted: $encrypted, readable: false);
    }

    /**
     * Embedded text per page, in page order.
     *
     * Retained for callers that only need the raw strings; pages with no text
     * contribute an empty entry so indexes still line up with page numbers.
     *
     * @return string[]
     */
    public function pageTexts(): array
    {
        return array_map(static fn (DocumentPage $page): string => $page->text, $this->pages);
    }

    /**
     * True only when *every* content-bearing page can be read from its own text
     * layer. One scanned page is enough to require vision for the document,
     * because that page's figures are otherwise lost.
     */
    public function canUseNativeText(): bool
    {
        if (! $this->readable || $this->pages === []) {
            return false;
        }

        $contentPages = array_filter(
            $this->pages,
            static fn (DocumentPage $page): bool => $page->kind->carriesContent(),
        );

        if ($contentPages === []) {
            return false;
        }

        foreach ($contentPages as $page) {
            if ($page->kind !== PageKind::NativeText) {
                return false;
            }
        }

        return true;
    }

    /** Pages that need vision to be read. @return DocumentPage[] */
    public function pagesNeedingVision(): array
    {
        return array_values(array_filter(
            $this->pages,
            static fn (DocumentPage $page): bool => $page->kind->needsVision(),
        ));
    }

    /** Pages carrying usable embedded text. @return DocumentPage[] */
    public function pagesWithText(): array
    {
        return array_values(array_filter(
            $this->pages,
            static fn (DocumentPage $page): bool => $page->hasUsableText(),
        ));
    }

    /**
     * A document that mixes digitally generated and scanned pages.
     *
     * This is the case the old average hid, and it needs both sources: the text
     * layer for exactness on the pages that have one, vision for the rest.
     */
    public function isMixed(): bool
    {
        return $this->readable
            && $this->pagesWithText() !== []
            && $this->pagesNeedingVision() !== [];
    }

    /**
     * Page-delimited text for the model.
     *
     * Boundaries are kept explicit so a total on page 3 is not silently
     * attributed to page 1, and so evidence can cite a real page number. Pages
     * that need vision are announced rather than omitted, so the model does not
     * read a gap as "this document has no line items".
     */
    public function toPromptText(int $maxChars): string
    {
        $parts = [];

        foreach ($this->pages as $page) {
            if ($page->hasUsableText()) {
                $parts[] = '--- PAGE '.$page->number." ---\n".$page->text;

                continue;
            }

            if ($page->kind->needsVision()) {
                $parts[] = '--- PAGE '.$page->number.' ---'
                    ."\n[This page is a scanned image. Its content is not in the text below;"
                    .' read it from the attached document image instead.]';
            }
        }

        $joined = implode("\n\n", $parts);

        return $maxChars > 0 ? mb_substr($joined, 0, $maxChars) : $joined;
    }

    /** @return array<int, array<string, mixed>> */
    public function pageMap(): array
    {
        return array_map(static fn (DocumentPage $page): array => $page->toArray(), $this->pages);
    }

    /** @return string[] warnings for the review screen */
    public function warnings(): array
    {
        $warnings = [];

        if ($this->truncated) {
            $warnings[] = 'This document has more pages than KiteLedger reads in one pass. Later pages were not included.';
        }

        $scanned = count($this->pagesNeedingVision());

        if ($this->isMixed()) {
            $warnings[] = $scanned === 1
                ? 'One page of this document is a scan and was read from the image. Check its figures carefully.'
                : "{$scanned} pages of this document are scans and were read from the image. Check their figures carefully.";
        }

        $unreadable = count(array_filter(
            $this->pages,
            static fn (DocumentPage $page): bool => $page->kind === PageKind::Unreadable,
        ));

        if ($unreadable > 0) {
            $warnings[] = $unreadable === 1
                ? 'One page could not be read and may be missing from the extraction.'
                : "{$unreadable} pages could not be read and may be missing from the extraction.";
        }

        return $warnings;
    }
}
