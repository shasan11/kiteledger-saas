<?php

declare(strict_types=1);

namespace App\Services\Documents\Pipeline;

/**
 * One group of pages sent to the model as a single extraction request.
 */
final readonly class DocumentChunk
{
    /**
     * @param  int[]  $pageNumbers  1-based page numbers this chunk covers
     */
    public function __construct(
        public int $index,
        public array $pageNumbers,
        public string $text,
    ) {}

    public function firstPage(): int
    {
        return $this->pageNumbers === [] ? 0 : min($this->pageNumbers);
    }

    public function lastPage(): int
    {
        return $this->pageNumbers === [] ? 0 : max($this->pageNumbers);
    }

    public function label(): string
    {
        return $this->firstPage() === $this->lastPage()
            ? 'page '.$this->firstPage()
            : 'pages '.$this->firstPage().'-'.$this->lastPage();
    }
}
