<?php

declare(strict_types=1);

namespace App\Services\Documents\Pipeline;

/**
 * What one page of a document turned out to be.
 *
 * Classified per page, never averaged across the document. A ten-page PDF whose
 * first five pages are digitally generated and whose last five are scanned
 * receipts passes any document-wide text-density test, and the scanned half is
 * then sent to the model as blank — the totals on those pages simply vanish
 * from the extraction without anyone being told.
 */
enum PageKind: string
{
    /** A usable embedded text layer; can be read exactly, no vision needed. */
    case NativeText = 'native_text';

    /** No meaningful text layer; needs vision to be read at all. */
    case ScannedImage = 'scanned_image';

    /**
     * Some text, but too little for the page's apparent content — a scan with
     * a header stamped over it, or a form whose labels are text and whose
     * values are an image. Both sources are needed.
     */
    case Mixed = 'mixed';

    /** Genuinely blank; a separator or trailing page. Nothing to extract. */
    case Empty = 'empty';

    /** The page could not be parsed at all. */
    case Unreadable = 'unreadable';

    /** Whether vision is required to read this page's content. */
    public function needsVision(): bool
    {
        return $this === self::ScannedImage || $this === self::Mixed || $this === self::Unreadable;
    }

    /** Whether the embedded text is worth sending to the model. */
    public function hasUsableText(): bool
    {
        return $this === self::NativeText || $this === self::Mixed;
    }

    /** An empty page is not a problem; it just has nothing on it. */
    public function carriesContent(): bool
    {
        return $this !== self::Empty;
    }

    public function label(): string
    {
        return match ($this) {
            self::NativeText => 'Digital text',
            self::ScannedImage => 'Scanned image',
            self::Mixed => 'Mixed text and image',
            self::Empty => 'Blank page',
            self::Unreadable => 'Unreadable page',
        };
    }
}
