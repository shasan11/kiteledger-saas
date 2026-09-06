<?php

declare(strict_types=1);

namespace App\Support\Money;

use App\Models\AppSetting;
use App\Models\Currency;
use Throwable;

/**
 * The single place money is turned into text for people to read.
 *
 * Every AI surface (Copilot answers, report summaries, document extraction
 * review) used to format amounts its own way - or not at all - which is how a
 * receivable balance ended up rendered as "1234.5" in one place and
 * "NPR 1,234.50" in another, with the currency hard-coded in the frontend.
 * Formatting here keeps the figure and its currency together from the service
 * that computed it all the way to the screen and to the model's prompt.
 *
 * Resolution order for the base currency: the currency flagged `is_base`, then
 * the app settings' default currency, then the tenant record, then USD. Every
 * lookup is wrapped because these surfaces must degrade to an unformatted
 * number rather than fail - a freshly provisioned tenant may have no currency
 * rows yet.
 */
class CurrencyFormatter
{
    private ?CurrencyInfo $base = null;

    /** @var array<string, CurrencyInfo> */
    private array $resolved = [];

    /**
     * Key fragments that mark a value as money. Checked against report column
     * keys and metric names, which is a heuristic - hence the exclusions below
     * win, so a "quantity" or "invoice_count" is never given a currency symbol.
     */
    private const MONETARY_HINTS = [
        'amount', 'total', 'balance', 'value', 'revenue', 'sales', 'purchase',
        'cost', 'price', 'rate_amount', 'debit', 'credit', 'due', 'paid',
        'outstanding', 'receivable', 'payable', 'profit', 'loss', 'expense',
        'income', 'tax', 'discount', 'subtotal', 'net', 'gross', 'cash',
        'payment', 'opening', 'closing', 'budget', 'salary', 'wage',
    ];

    /**
     * Beats MONETARY_HINTS. "total_quantity" and "invoice_count" both contain a
     * monetary hint but are not money.
     */
    private const NON_MONETARY_HINTS = [
        'count', 'quantity', 'qty', 'percent', 'percentage', 'ratio', 'days',
        'age', 'ageing', 'aging', 'number', 'no_of', 'units', 'weight',
        'exchange_rate', 'tax_rate', 'discount_rate', 'id', 'year', 'month',
        'share', 'index', 'score', 'stock', 'level',
    ];

    public function base(): CurrencyInfo
    {
        if ($this->base instanceof CurrencyInfo) {
            return $this->base;
        }

        return $this->base = $this->discoverBase();
    }

    /**
     * Currency for a specific code - a document's own currency, say - falling
     * back to the base currency when the code is unknown or absent.
     */
    public function info(?string $code = null): CurrencyInfo
    {
        $code = is_string($code) ? strtoupper(trim($code)) : '';

        if ($code === '') {
            return $this->base();
        }

        if (isset($this->resolved[$code])) {
            return $this->resolved[$code];
        }

        if ($code === $this->base()->code) {
            return $this->resolved[$code] = $this->base();
        }

        try {
            $currency = Currency::query()->where('code', $code)->first();
        } catch (Throwable) {
            $currency = null;
        }

        return $this->resolved[$code] = $currency
            ? $this->fromModel($currency)
            : CurrencyInfo::fallback($code);
    }

    /**
     * "Rs 1,234.50". The symbol is used when the currency defines one, so the
     * output matches how amounts already read elsewhere in the app.
     */
    public function format(mixed $value, ?string $code = null): string
    {
        $currency = $this->info($code);
        $number = $this->number($value, $currency->decimalPlaces);

        return trim($currency->symbol.' '.$number);
    }

    /** The amount alone, grouped and rounded to the currency's precision. */
    public function amount(mixed $value, ?string $code = null): string
    {
        return $this->number($value, $this->info($code)->decimalPlaces);
    }

    /**
     * A non-money number: grouped, and only given decimals when it has them, so
     * a count of 12 does not read as "12.00".
     */
    public function plain(mixed $value): string
    {
        return $this->number($value, $this->decimalsFor($value));
    }

    /**
     * Formats when the key looks monetary, otherwise returns a plain grouped
     * number - so counts and quantities keep their own shape.
     */
    public function formatByKey(string $key, mixed $value, ?string $code = null): string
    {
        return self::looksMonetary($key)
            ? $this->format($value, $code)
            : $this->plain($value);
    }

    public static function looksMonetary(string $key): bool
    {
        $key = strtolower(trim($key));

        if ($key === '') {
            return false;
        }

        foreach (self::NON_MONETARY_HINTS as $hint) {
            if (str_contains($key, $hint)) {
                return false;
            }
        }

        foreach (self::MONETARY_HINTS as $hint) {
            if (str_contains($key, $hint)) {
                return true;
            }
        }

        return false;
    }

    private function number(mixed $value, int $decimals): string
    {
        if (! is_numeric($value)) {
            return (string) (is_scalar($value) ? $value : '');
        }

        return number_format((float) $value, max(0, $decimals), '.', ',');
    }

    /** Whole numbers stay whole; fractional counts keep two places. */
    private function decimalsFor(mixed $value): int
    {
        if (! is_numeric($value)) {
            return 0;
        }

        return (float) $value === floor((float) $value) ? 0 : 2;
    }

    private function discoverBase(): CurrencyInfo
    {
        try {
            $currency = Currency::query()->where('is_base', true)->first();

            if (! $currency) {
                $settings = AppSetting::query()->with('defaultCurrency')->where('active', true)->oldest()->first()
                    ?: AppSetting::query()->with('defaultCurrency')->oldest()->first();

                $currency = $settings?->defaultCurrency;
            }

            if ($currency) {
                return $this->fromModel($currency);
            }
        } catch (Throwable) {
            // No currency table yet (fresh tenant) - fall through to config.
        }

        $code = null;

        try {
            $code = tenant()?->currency;
        } catch (Throwable) {
            $code = null;
        }

        return CurrencyInfo::fallback(strtoupper((string) ($code ?: config('app.currency', 'USD'))));
    }

    private function fromModel(Currency $currency): CurrencyInfo
    {
        $code = strtoupper((string) ($currency->code ?: 'USD'));

        return new CurrencyInfo(
            code: $code,
            symbol: (string) ($currency->symbol ?: $code),
            decimalPlaces: (int) ($currency->decimal_places ?? 2),
        );
    }
}
