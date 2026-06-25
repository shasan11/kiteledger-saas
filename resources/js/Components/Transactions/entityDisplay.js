// Shared "never show a UUID to a human" helpers.
//
// UUIDs remain valid for API calls, route params, hidden payloads and React
// keys — but must never be rendered in any user-facing surface. These helpers
// turn entity objects/ids into readable labels and strip ids from detail blobs.
//
// NOTE on the matcher: this app issues ordered UUIDv7 ids (e.g.
// "019ef850-7ba8-7328-814d-92b80c39b20a"), so a strict v1–v5 regex would miss
// them. We match the canonical 8-4-4-4-12 hex shape for ANY version, which
// still never matches document numbers like INV-0001, JV-0004 or CT-0002.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_ANYWHERE_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** True when the value is a canonical UUID string (any version). */
export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

// Ordered preference of human-readable fields on an entity object.
const LABEL_FIELDS = [
  'display_name', 'company_name', 'person_name', 'full_name', 'name', 'label',
  'account_name', 'bank_name', 'title',
  'invoice_no', 'bill_no', 'payment_no', 'voucher_no', 'journal_no', 'transfer_no',
  'adjustment_no', 'production_order_no', 'production_journal_no',
  'purchase_order_no', 'sales_order_no', 'quotation_no', 'proforma_no',
  'expense_no', 'debit_note_no', 'code', 'sku', 'email', 'phone',
];

/**
 * Return a safe, human-readable label for a value that may be a string, number,
 * or an entity object. Never returns a UUID.
 *
 * @param {*} value
 * @param {{fallback?: string|null, fields?: string[]}} options
 */
export function entityLabel(value, options = {}) {
  const fallback = options.fallback === undefined ? '-' : options.fallback;

  if (value === null || value === undefined || value === '') return fallback;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || isUuid(trimmed)) return fallback;
    return trimmed;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : fallback;
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      const parts = value.map((v) => entityLabel(v, { fallback: null })).filter(Boolean);
      return parts.length ? parts.join(', ') : fallback;
    }

    const fields = options.fields ? [...options.fields, ...LABEL_FIELDS] : LABEL_FIELDS;
    for (const field of fields) {
      const candidate = value[field];
      if (candidate === null || candidate === undefined || candidate === '') continue;
      if (typeof candidate === 'object') continue; // labels come from primitives only
      if (typeof candidate === 'string' && isUuid(candidate)) continue;
      return String(candidate);
    }
    return fallback;
  }

  return fallback;
}

// Keys that identify an entity and must never be shown.
const ID_KEY_RE = /(^id$|^uuid$|_id$|_uuid$)/i;

const isIdKey = (key) => ID_KEY_RE.test(String(key));

// 'contact_id' -> 'contact', 'purchase_bill_id' -> 'purchase_bill'
const pairedObjectKey = (idKey) =>
  String(idKey).replace(/_id$/i, '').replace(/_uuid$/i, '');

/**
 * Recursively strip ID/UUID keys and UUID string values from a details blob,
 * collapsing paired entity objects (contact_id + contact) into a readable label.
 * Returns a structure safe to render. Keys are left raw so the display layer can
 * humanize them; values never contain a UUID.
 */
export function sanitizeDisplayDetails(details) {
  if (details === null || details === undefined) return details;

  if (Array.isArray(details)) {
    return details
      .map((item) => sanitizeDisplayDetails(item))
      .filter((item) => item !== undefined && !(item && typeof item === 'object' && !Object.keys(item).length));
  }

  if (typeof details === 'string') {
    return isUuid(details) ? undefined : details;
  }

  if (typeof details !== 'object') {
    return details;
  }

  const out = {};
  for (const [key, value] of Object.entries(details)) {
    // ID-like key: drop it. If a paired entity object exists, it is rendered
    // when we reach that key — so just skip the raw id here.
    if (isIdKey(key)) {
      continue;
    }

    // Nested entity object → collapse to its readable label when possible.
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const label = entityLabel(value, { fallback: null });
      if (label) {
        out[key] = label;
      } else {
        const nested = sanitizeDisplayDetails(value);
        if (nested && Object.keys(nested).length) out[key] = nested;
      }
      continue;
    }

    if (Array.isArray(value)) {
      const arr = sanitizeDisplayDetails(value);
      if (arr && arr.length) out[key] = arr;
      continue;
    }

    // Primitive: drop empty + UUID strings, keep meaningful values.
    if (value === null || value === undefined || value === '') continue;
    if (typeof value === 'string' && isUuid(value)) continue;

    out[key] = value;
  }

  return out;
}

/** Remove any UUIDs that leaked into a free-text message (e.g. backend errors). */
export function stripUuids(text, replacement = '') {
  if (typeof text !== 'string') return text;
  return text.replace(UUID_ANYWHERE_RE, replacement).replace(/\s{2,}/g, ' ').trim();
}

/**
 * A React key for a row. UUIDs are fine here (keys are not rendered); prefers a
 * stable id, then a readable label, then the provided fallback (e.g. index).
 */
export function safeRowKey(row, fallback) {
  if (row && typeof row === 'object') {
    const id = row.id ?? row.uuid;
    if (id !== undefined && id !== null && id !== '') return String(id);
    const label = entityLabel(row, { fallback: null });
    if (label) return label;
  }
  return String(fallback);
}
