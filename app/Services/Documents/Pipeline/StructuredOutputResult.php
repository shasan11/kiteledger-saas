<?php

declare(strict_types=1);

namespace App\Services\Documents\Pipeline;

/**
 * Outcome of parsing the model's extraction payload.
 *
 * `repaired` and `partial` are carried forward so the review screen can warn
 * the user that the source output needed fixing or was incomplete — that
 * context changes how carefully they should check the result.
 */
final readonly class StructuredOutputResult
{
    /**
     * @param array<string, mixed> $data
     */
    private function __construct(
        public bool $ok,
        public array $data = [],
        public bool $repaired = false,
        public bool $partial = false,
        public ?DocumentErrorCode $errorCode = null,
        public ?string $diagnostic = null,
    ) {}

    public static function succeeded(array $data, bool $repaired = false, bool $partial = false): self
    {
        return new self(ok: true, data: $data, repaired: $repaired, partial: $partial);
    }

    /** @param string $diagnostic sanitized, for debug users and logs only */
    public static function failed(DocumentErrorCode $code, string $diagnostic): self
    {
        return new self(ok: false, errorCode: $code, diagnostic: $diagnostic);
    }

    /** @return string[] warnings to surface on the review screen */
    public function warnings(): array
    {
        $warnings = [];

        if ($this->repaired) {
            $warnings[] = 'The document was read with some difficulty. Please check the details carefully.';
        }

        if ($this->partial) {
            $warnings[] = 'Only part of this document could be read. Some details may be missing.';
        }

        return $warnings;
    }
}
