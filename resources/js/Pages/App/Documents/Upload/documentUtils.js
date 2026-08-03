/*
 * Pure helpers and field maps for the Document Intelligence inbox.
 *
 * Extracted from Upload/Index.jsx, which had grown past 2,400 lines with
 * these interleaved between component code. They are side-effect free and
 * depend on no React state, so they are the safest part to lift out and are
 * now reusable by the review workspace.
 */

export const STATUS_LABELS = {
    uploaded: 'Uploaded',
    queued: 'Queued',
    processing: 'Processing',
    extracted: 'Extracted',
    needs_review: 'Needs Review',
    converted: 'Converted',
    failed: 'Failed',
    archived: 'Archived',
};

export const SUMMARY_FIELDS = [
    { key: 'document_type', label: 'Document Type' },
    { key: 'document_number', label: 'Document Number', aliases: ['invoice_number', 'bill_number', 'number', 'reference_number'] },
    { key: 'document_date', label: 'Document Date', aliases: ['invoice_date', 'bill_date', 'date'] },
    { key: 'due_date', label: 'Due Date' },
    { key: 'currency_code', label: 'Currency', aliases: ['currency'] },
    { key: 'confidence', label: 'Confidence' },
];

export const TOTAL_FIELDS = [
    { key: 'subtotal', label: 'Subtotal', aliases: ['sub_total'] },
    { key: 'discount_amount', label: 'Discount' },
    { key: 'tax_amount', label: 'Tax' },
    { key: 'shipping_amount', label: 'Shipping' },
    { key: 'total', label: 'Total', aliases: ['grand_total', 'total_amount', 'amount'] },
    { key: 'amount_due', label: 'Amount Due', aliases: ['balance_due'] },
];

export const LINE_ITEM_KEYS = ['line_items', 'lines', 'items', 'products', 'services'];

export const PARTY_KEYS = [
    'extracted_party',
    'party',
    'vendor',
    'supplier',
    'customer',
    'client',
    'bill_to',
    'ship_to',
];

export const EXCLUDED_EXTRACTION_KEYS = [
    ...LINE_ITEM_KEYS,
    ...PARTY_KEYS,
    'warnings',
    'raw',
    'raw_text',
    'metadata',
    'confidence',
    'subtotal',
    'sub_total',
    'discount_amount',
    'tax_amount',
    'shipping_amount',
    'total',
    'grand_total',
    'total_amount',
    'amount',
    'amount_due',
    'balance_due',
];

export function hasPerm(perms, key) {
    return !!(perms && perms[key]);
}

export function docKey(doc) {
    return doc?.public_id;
}

export function isUuidLike(value) {
    if (value === null || value === undefined) return false;

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(value).trim(),
    );
}

export function isIdLikeKey(key) {
    return /(^id$|_id$|uuid|guid|token|hash|password|secret)/i.test(String(key || ''));
}

export function humanize(value) {
    if (value === null || value === undefined || value === '') return '-';

    return String(value)
        .replace(/[_-]+/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function safeDisplay(value, fallback = '-') {
    if (value === null || value === undefined || value === '') return fallback;
    if (isUuidLike(value)) return fallback;

    if (typeof value === 'boolean') return value ? 'Yes' : 'No';

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : fallback;
    }

    return String(value);
}

export function asArray(value) {
    if (Array.isArray(value)) return value;

    if (!value || typeof value !== 'object') return [];

    if (Array.isArray(value.data)) return value.data;
    if (Array.isArray(value.results)) return value.results;
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.fields)) return value.fields;
    if (Array.isArray(value.schema)) return value.schema;
    if (Array.isArray(value.records)) return value.records;
    if (value.data && typeof value.data === 'object' && Array.isArray(value.data.data)) return value.data.data;
    if (value.results && typeof value.results === 'object' && Array.isArray(value.results.data)) return value.results.data;

    return Object.values(value).filter((item) => item !== null && item !== undefined);
}

export function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function cleanExtractionValue(value, fallback = '-') {
    if (value === null || value === undefined || value === '') return fallback;
    if (isUuidLike(value)) return fallback;

    if (typeof value === 'boolean') return value ? 'Yes' : 'No';

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : fallback;
    }

    if (Array.isArray(value)) {
        const cleaned = value
            .map((item) => {
                if (item === null || item === undefined || item === '') return null;
                if (isUuidLike(item)) return null;
                if (typeof item === 'object') return null;
                return safeDisplay(item, null);
            })
            .filter(Boolean);

        return cleaned.length ? cleaned.join(', ') : fallback;
    }

    if (typeof value === 'object') {
        const cleaned = Object.entries(value)
            .filter(([key, item]) => !isIdLikeKey(key) && !isUuidLike(item) && item !== null && item !== undefined && item !== '')
            .map(([key, item]) => `${humanize(key)}: ${safeDisplay(item)}`);

        return cleaned.length ? cleaned.join(', ') : fallback;
    }

    return safeDisplay(value, fallback);
}

export function money(value) {
    const numeric = Number(value || 0);
    return Number.isFinite(numeric) ? numeric.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-';
}

export function fileSize(bytes) {
    const size = Number(bytes || 0);
    if (!size) return '-';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function toOptions(items = []) {
    return asArray(items).map((item) => (typeof item === 'string'
        ? { value: item, label: humanize(item) }
        : { ...item, label: humanize(item.label || item.value) }));
}

export function formatList(items = []) {
    const cleaned = asArray(items)
        .map((item) => cleanExtractionValue(item))
        .filter((item) => item && item !== '-');

    return cleaned.length ? cleaned.join(', ') : '-';
}

export function recalcLines(lines = []) {
    const next = asArray(lines).map((line) => {
        const qty = Number(line.qty || 1);
        const rate = Number(line.unit_price || 0);
        const discount = Number(line.discount_amount || 0);
        const tax = Number(line.tax_amount || 0);

        return {
            ...line,
            qty,
            unit_price: rate,
            discount_amount: discount,
            tax_amount: tax,
            line_total: Number(((qty * rate) - discount + tax).toFixed(2)),
        };
    });

    const total = next.reduce((sum, line) => sum + Number(line.line_total || 0), 0);

    return { lines: next, total: Number(total.toFixed(2)) };
}

export function pickValue(source = {}, keys = []) {
    const target = asObject(source);

    for (const key of keys) {
        if (target?.[key] !== null && target?.[key] !== undefined && target?.[key] !== '') {
            return target[key];
        }
    }

    return null;
}

export function getFirstObject(source = {}, keys = []) {
    const target = asObject(source);

    for (const key of keys) {
        const value = target?.[key];

        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return value;
        }
    }

    return {};
}

export function getExtractedParty(normalized = {}, payload = {}) {
    return getFirstObject(normalized, PARTY_KEYS)
        || getFirstObject(payload, PARTY_KEYS)
        || {};
}

export function getLineItems(normalized = {}, payload = {}) {
    for (const source of [asObject(normalized), asObject(payload)]) {
        for (const key of LINE_ITEM_KEYS) {
            if (Array.isArray(source?.[key])) {
                return source[key];
            }
        }
    }

    return [];
}

export function normalizeLineItem(line = {}) {
    const source = asObject(line);
    const qty = Number(pickValue(source, ['qty', 'quantity']) || 1);
    const unitPrice = Number(pickValue(source, ['unit_price', 'rate', 'price']) || 0);
    const discount = Number(pickValue(source, ['discount_amount', 'discount']) || 0);
    const tax = Number(pickValue(source, ['tax_amount', 'tax']) || 0);
    const suppliedTotal = pickValue(source, ['line_total', 'total', 'amount']);

    return {
        ...source,
        product_id: pickValue(source, ['product_id', 'matched_product_id']) || null,
        product_name: pickValue(source, ['product_name', 'name', 'item']) || null,
        description: pickValue(source, ['description', 'details', 'product_name', 'name', 'item']) || '',
        qty: Number.isFinite(qty) ? qty : 1,
        unit: pickValue(source, ['unit', 'uom', 'unit_name']) || '',
        unit_price: Number.isFinite(unitPrice) ? unitPrice : 0,
        discount_amount: Number.isFinite(discount) ? discount : 0,
        tax_amount: Number.isFinite(tax) ? tax : 0,
        line_total: Number.isFinite(Number(suppliedTotal))
            ? Number(suppliedTotal)
            : Number(((qty * unitPrice) - discount + tax).toFixed(2)),
    };
}

export function reviewLinesFromData(payload = {}, data = {}) {
    const normalized = data?.extraction?.normalized_json || {};
    const candidates = [
        payload.lines,
        payload.line_items,
        payload.items,
        payload.products,
        payload.services,
        data?.mapped_payload?.lines,
        data?.mapped_payload?.line_items,
        normalized.lines,
        normalized.line_items,
        normalized.items,
        normalized.products,
        normalized.services,
    ];

    const lines = candidates.find((items) => Array.isArray(items) && items.length > 0) || [];
    return lines.map(normalizeLineItem);
}

export function buildKnownRows(source = {}, fields = []) {
    const rows = [];

    fields.forEach((field) => {
        const value = pickValue(source, [field.key, ...(field.aliases || [])]);
        const display = cleanExtractionValue(value);

        if (display !== '-') {
            rows.push({
                key: field.key,
                field: field.label,
                value: display,
            });
        }
    });

    return rows;
}

export function buildObjectRows(source = {}, excluded = []) {
    const excludedSet = new Set(excluded);
    const rows = [];

    Object.entries(asObject(source)).forEach(([key, value]) => {
        if (excludedSet.has(key)) return;
        if (isIdLikeKey(key)) return;
        if (Array.isArray(value)) return;
        if (value && typeof value === 'object') return;

        const display = cleanExtractionValue(value);

        if (display !== '-') {
            rows.push({
                key,
                field: humanize(key),
                value: display,
            });
        }
    });

    return rows;
}

export function getLineValue(row, keys = []) {
    return cleanExtractionValue(pickValue(row, keys));
}

export function optionLabel(row) {
    const record = asObject(row);

    return record.display_name
        || record.name
        || record.code
        || record.label
        || record.title
        || record.email
        || record.number
        || record.reference
        || record.original_name
        || record.original_file_name
        || 'Record';
}
