/**
 * Rendering money the way the server said to.
 *
 * Every AI surface (Copilot answers, report summaries, document extraction)
 * now sends a `currency` descriptor - `{ code, symbol, decimal_places }` - next
 * to its raw figures, and usually a pre-rendered `formatted` string as well.
 * These helpers exist so no component hard-codes a symbol of its own; a tenant
 * on AED must never see amounts labelled NPR because a component guessed.
 */

const FALLBACK = { code: '', symbol: '', decimal_places: 2 };

export function currencyOf(source) {
    if (!source || typeof source !== 'object') return FALLBACK;

    const code = typeof source.code === 'string' ? source.code : '';
    const symbol = typeof source.symbol === 'string' && source.symbol ? source.symbol : code;
    const decimals = Number(source.decimal_places);

    return {
        code,
        symbol,
        decimal_places: Number.isFinite(decimals) ? decimals : 2,
    };
}

/** Grouped number with a fixed number of decimals. */
export function formatNumber(value, decimals = 2) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '';

    return numeric.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/** "Rs 1,234.50" using the tenant's own symbol and precision. */
export function formatMoney(value, currency) {
    const info = currencyOf(currency);
    const amount = formatNumber(value, info.decimal_places);

    if (amount === '') return '';

    return info.symbol ? `${info.symbol} ${amount}` : amount;
}

/**
 * The server's rendered string when it sent one, formatted locally otherwise.
 * Preferring the server keeps the figure identical to the one the AI narration
 * quotes.
 */
export function displayMoney(formatted, value, currency) {
    if (typeof formatted === 'string' && formatted !== '') return formatted;

    return formatMoney(value, currency);
}
