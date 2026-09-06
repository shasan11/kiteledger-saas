<?php

declare(strict_types=1);

namespace App\Support\Money;

/**
 * A currency as it needs to be *displayed*: code, symbol and precision.
 *
 * Deliberately a value object rather than the Eloquent model, so the AI layers
 * can carry currency information into prompts, JSON payloads and caches without
 * dragging a tenant-bound model along with it.
 */
final readonly class CurrencyInfo
{
    public function __construct(
        public string $code,
        public string $symbol,
        public int $decimalPlaces = 2,
    ) {}

    public static function fallback(string $code = 'USD'): self
    {
        return new self($code, $code, 2);
    }

    /** @return array{code: string, symbol: string, decimal_places: int} */
    public function toArray(): array
    {
        return [
            'code' => $this->code,
            'symbol' => $this->symbol,
            'decimal_places' => $this->decimalPlaces,
        ];
    }
}
