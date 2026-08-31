// Returns "#DRAFT" for unapproved records, or the real document number for approved ones.
export const DRAFT_NUMBER = '#DRAFT';

export const isApproved = (record) => {
  if (!record || typeof record !== 'object') return false;
  if (record.approved === true || record.approved === 1 || record.approved === '1') return true;
  if (record.is_approved === true || record.is_approved === 1 || record.is_approved === '1') return true;
  if (record.approved_at) return true;
  const status = (record.status || '').toString().toLowerCase();
  if (status && status !== 'draft' && status !== 'pending' && status !== 'unapproved') return true;
  return false;
};

/**
 * Placeholders the backend writes into a number column before approval.
 * Current form is "DRAFT-INVOICE-WCTE6B"; older rows carry "#draft-INVOICE-<uuid>",
 * which also leaked an internal identifier. Neither should reach a user.
 */
const DRAFT_PATTERNS = [/^draft-/i, /^#draft/i];

export const isDraftNumber = (value) => {
    const normalized = String(value ?? '').trim();

    return normalized === '' || DRAFT_PATTERNS.some((pattern) => pattern.test(normalized));
};

/**
 * Same intent as displayDocumentNumber, for the places that only have the
 * number string rather than the whole record.
 */
export const formatDocumentNumber = (value, { draftLabel = DRAFT_NUMBER, emptyLabel = DRAFT_NUMBER } = {}) => {
    const normalized = String(value ?? '').trim();

    if (normalized === '') return emptyLabel;

    return isDraftNumber(normalized) ? draftLabel : normalized;
};

export const displayDocumentNumber = (record, numberField) => {
  if (!record || typeof record !== 'object') return DRAFT_NUMBER;
  if (!isApproved(record)) return DRAFT_NUMBER;
  const v = record[numberField];
  if (v === undefined || v === null || v === '') return DRAFT_NUMBER;
  return v;
};

export default displayDocumentNumber;
