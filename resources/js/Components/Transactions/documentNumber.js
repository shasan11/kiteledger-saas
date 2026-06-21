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

export const displayDocumentNumber = (record, numberField) => {
  if (!record || typeof record !== 'object') return DRAFT_NUMBER;
  if (!isApproved(record)) return DRAFT_NUMBER;
  const v = record[numberField];
  if (v === undefined || v === null || v === '') return DRAFT_NUMBER;
  return v;
};

export default displayDocumentNumber;
