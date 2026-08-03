<?php

declare(strict_types=1);

namespace App\Services\Documents\Matching;

/**
 * One ranked suggestion for an extracted entity.
 *
 * Carries *why* it matched, not just how well. "Matched by tax number" is
 * something a reviewer can verify at a glance; "88% similar" is a number they
 * have no way to check.
 */
final readonly class MatchCandidate
{
    public function __construct(
        public string $publicId,
        public string $displayName,
        public string $reason,
        public float $score,
        public ?string $code = null,
        public ?string $taxNumber = null,
    ) {}

    /** Strong enough to pre-select without a human confirming. */
    public function isAutoSelectable(): bool
    {
        return $this->score >= self::autoSelectThreshold();
    }

    public static function autoSelectThreshold(): float
    {
        return (float) config('documents.matching.auto_select_threshold', 0.95);
    }

    public static function suggestionThreshold(): float
    {
        return (float) config('documents.matching.suggestion_threshold', 0.55);
    }

    /**
     * Client shape. The raw score is deliberately omitted — the reason is the
     * useful part, and a percentage invites false precision.
     */
    public function toArray(): array
    {
        return array_filter([
            'public_id' => $this->publicId,
            'display_name' => $this->displayName,
            'reason' => $this->reason,
            'code' => $this->code,
            'tax_number' => $this->taxNumber,
            'auto_selectable' => $this->isAutoSelectable(),
        ], static fn ($v) => $v !== null);
    }
}
