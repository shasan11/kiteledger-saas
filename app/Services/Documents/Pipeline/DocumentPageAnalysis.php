<?php

declare(strict_types=1);

namespace App\Services\Documents\Pipeline;

/**
 * What could be learned about a PDF's structure before extraction.
 */
final readonly class DocumentPageAnalysis
{
    /**
     * @param string[] $pageTexts embedded text per page, in page order
     */
    public function __construct(
        public int $pageCount = 0,
        public array $pageTexts = [],
        public bool $hasTextLayer = false,
        public bool $truncated = false,
        public bool $encrypted = false,
        public bool $readable = false,
    ) {}

    /** Structure could not be read; the caller should fall back to vision. */
    public static function unreadable(bool $encrypted): self
    {
        return new self(encrypted: $encrypted, readable: false);
    }

    /** True when the embedded text is good enough to skip vision entirely. */
    public function canUseNativeText(): bool
    {
        return $this->readable && $this->hasTextLayer && $this->pageTexts !== [];
    }

    /**
     * Page-delimited text for the model.
     *
     * Boundaries are kept explicit so a total on page 3 is not silently
     * attributed to page 1, and so evidence can cite a real page number.
     */
    public function toPromptText(int $maxChars): string
    {
        $parts = [];

        foreach ($this->pageTexts as $index => $text) {
            if (trim($text) === '') {
                continue;
            }

            $parts[] = '--- PAGE '.($index + 1)." ---\n".$text;
        }

        $joined = implode("\n\n", $parts);

        return $maxChars > 0 ? mb_substr($joined, 0, $maxChars) : $joined;
    }

    /** @return string[] warnings for the review screen */
    public function warnings(): array
    {
        $warnings = [];

        if ($this->truncated) {
            $warnings[] = 'This document has more pages than KiteLedger reads in one pass. Later pages were not included.';
        }

        return $warnings;
    }
}
