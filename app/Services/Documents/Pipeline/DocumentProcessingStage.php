<?php

declare(strict_types=1);

namespace App\Services\Documents\Pipeline;

/**
 * Where a document is in the processing pipeline.
 *
 * Deliberately stage-based rather than a percentage: the pipeline has no way to
 * know how far through a provider call it is, so any number would be invented.
 * Naming the current step is honest and just as reassuring.
 */
enum DocumentProcessingStage: string
{
    case Uploaded = 'uploaded';
    case Queued = 'queued';
    case Preparing = 'preparing';
    case Reading = 'reading';
    case Extracting = 'extracting';
    case Normalizing = 'normalizing';
    case Validating = 'validating';
    case Matching = 'matching';
    case ReadyForReview = 'ready_for_review';
    case Failed = 'failed';

    /** Shown to the user. No provider, model or pipeline jargon. */
    public function label(): string
    {
        return match ($this) {
            self::Uploaded => 'Uploaded',
            self::Queued => 'Waiting to start',
            self::Preparing => 'Preparing document',
            self::Reading => 'Reading pages',
            self::Extracting => 'Extracting information',
            self::Normalizing => 'Organising the details',
            self::Validating => 'Checking totals',
            self::Matching => 'Matching KiteLedger records',
            self::ReadyForReview => 'Preparing your review',
            self::Failed => 'Could not be processed',
        };
    }

    public function isTerminal(): bool
    {
        return $this === self::ReadyForReview || $this === self::Failed;
    }

    public function isActive(): bool
    {
        return ! $this->isTerminal() && $this !== self::Uploaded;
    }

    /** Ordered pipeline, used to render a progress timeline. */
    public static function timeline(): array
    {
        return [
            self::Preparing,
            self::Reading,
            self::Extracting,
            self::Normalizing,
            self::Validating,
            self::Matching,
            self::ReadyForReview,
        ];
    }

    public function position(): int
    {
        $index = array_search($this, self::timeline(), true);

        return $index === false ? 0 : $index + 1;
    }

    public static function fromValue(?string $value): self
    {
        return self::tryFrom(strtolower(trim((string) $value))) ?? self::Uploaded;
    }
}
