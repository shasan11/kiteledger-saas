<?php

declare(strict_types=1);

namespace App\Services\Documents\Contracts;

/**
 * Where a field's current value came from.
 *
 * This distinction is the point of the v2 contract. The v1 normalizer wrote a
 * computed grand total into the same key as one printed on the page, so the
 * review screen could not tell the user whether KiteLedger had *read* a number
 * or *calculated* it. Presenting a derived figure as though it appeared on the
 * document is how a wrong total gets approved.
 */
enum FieldOrigin: string
{
    /** Read directly from the document by the model. */
    case Extracted = 'extracted';

    /** Calculated by a deterministic service because the document did not show it. */
    case Derived = 'derived';

    /** Resolved to an existing KiteLedger record. */
    case Matched = 'matched';

    /** Set or confirmed by the reviewing user. */
    case User = 'user';

    /** Filled from a tenant default because nothing was found. */
    case Defaulted = 'defaulted';

    case Unknown = 'unknown';

    /** User-facing label; never shows the raw enum value. */
    public function label(): string
    {
        return match ($this) {
            self::Extracted => 'From document',
            self::Derived => 'Calculated',
            self::Matched => 'Matched',
            self::User => 'You entered',
            self::Defaulted => 'Default',
            self::Unknown => 'Unknown',
        };
    }

    /** Whether the value can be attributed to something visible on the page. */
    public function isFromDocument(): bool
    {
        return $this === self::Extracted;
    }

    public static function fromValue(?string $value): self
    {
        return self::tryFrom(strtolower(trim((string) $value))) ?? self::Unknown;
    }
}
