<?php

declare(strict_types=1);

namespace App\Services\Documents\Pipeline;

/**
 * The merged extraction across every chunk, plus an honest account of coverage.
 *
 * `pagesFailed` and `pagesOmitted` exist so the review screen can say what was
 * *not* read. A scan that quietly covers 12 of 50 pages while presenting itself
 * as complete is the failure mode this guards against.
 */
final readonly class ChunkMergeResult
{
    /**
     * @param  array<string, mixed>  $data  merged extraction payload
     * @param  int[]  $pagesProcessed
     * @param  int[]  $pagesFailed
     * @param  int[]  $pagesOmitted
     * @param  string[]  $warnings
     */
    public function __construct(
        public array $data,
        public array $pagesProcessed = [],
        public array $pagesFailed = [],
        public array $pagesOmitted = [],
        public array $warnings = [],
        public int $chunkCount = 1,
    ) {}

    public function isComplete(): bool
    {
        return $this->pagesFailed === [] && $this->pagesOmitted === [];
    }

    /** @return array<string, mixed> */
    public function coverage(): array
    {
        return [
            'chunk_count' => $this->chunkCount,
            'pages_processed' => $this->pagesProcessed,
            'pages_failed' => $this->pagesFailed,
            'pages_omitted' => $this->pagesOmitted,
            'complete' => $this->isComplete(),
        ];
    }
}
