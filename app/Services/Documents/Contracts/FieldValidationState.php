<?php

declare(strict_types=1);

namespace App\Services\Documents\Contracts;

/**
 * Review state of a single field.
 *
 * Drives what the review screen asks the user to look at. Only states that
 * genuinely need attention are surfaced, so a document where everything read
 * cleanly presents as "nothing to review" rather than a wall of fields.
 */
enum FieldValidationState: string
{
    case Ok = 'ok';
    case Missing = 'missing';
    case LowConfidence = 'low_confidence';
    case Conflict = 'conflict';
    case Unmatched = 'unmatched';
    case UserConfirmed = 'user_confirmed';

    public function needsReview(): bool
    {
        return match ($this) {
            self::Missing, self::LowConfidence, self::Conflict, self::Unmatched => true,
            default => false,
        };
    }

    /** Blocking states prevent draft creation until resolved. */
    public function isBlocking(): bool
    {
        return $this === self::Missing || $this === self::Conflict;
    }

    public function label(): string
    {
        return match ($this) {
            self::Ok => 'High confidence',
            self::Missing => 'Missing',
            self::LowConfidence => 'Review recommended',
            self::Conflict => 'Conflict',
            self::Unmatched => 'Not matched',
            self::UserConfirmed => 'You confirmed',
        };
    }

    /** Semantic colour per the design system: green / amber / red / blue / gray. */
    public function tone(): string
    {
        return match ($this) {
            self::Ok, self::UserConfirmed => 'green',
            self::LowConfidence, self::Unmatched => 'amber',
            self::Missing, self::Conflict => 'red',
        };
    }
}
