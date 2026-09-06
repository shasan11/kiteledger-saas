<?php

declare(strict_types=1);

namespace App\Services\Documents\Pipeline;

/**
 * One analyzed page.
 *
 * Page numbers are 1-based throughout the pipeline because that is what a
 * reviewer sees when they open the file — an off-by-one here becomes a wrong
 * citation on the review screen, which is worse than no citation.
 */
final readonly class DocumentPage
{
    public function __construct(
        public int $number,
        public PageKind $kind,
        public string $text = '',
        public int $characterCount = 0,
    ) {}

    public function hasUsableText(): bool
    {
        return $this->kind->hasUsableText() && trim($this->text) !== '';
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'page' => $this->number,
            'kind' => $this->kind->value,
            'kind_label' => $this->kind->label(),
            'character_count' => $this->characterCount,
        ];
    }
}
