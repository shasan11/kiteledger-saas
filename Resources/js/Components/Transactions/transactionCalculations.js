import dayjs from 'dayjs';

export const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const roundMoney = (v) => Number(toNumber(v).toFixed(2));

export const asId = (v) => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'object') return v.id ?? v.value ?? null;
  return v;
};

export const cleanText = (v) => {
  if (v === undefined || v === null) return '';
  return String(v);
};

export const nullIfEmpty = (v) => {
  if (v === undefined || v === null || v === '') return null;
  return v;
};

export const formatDate = (v) => {
  if (!v) return null;
  if (dayjs.isDayjs(v)) return v.isValid() ? v.format('YYYY-MM-DD') : null;
  const parsed = dayjs(v, ['YYYY-MM-DD', 'DD-MM-YYYY'], true);
  if (parsed.isValid()) return parsed.format('YYYY-MM-DD');
  const fallback = dayjs(v);
  return fallback.isValid() ? fallback.format('YYYY-MM-DD') : null;
};

export const toDayjs = (v) => {
  if (!v) return null;
  if (dayjs.isDayjs(v)) return v;
  const parsed = dayjs(v, ['YYYY-MM-DD', 'DD-MM-YYYY']);
  return parsed.isValid() ? parsed : null;
};

export const getTaxPercent = (v) => {
  if (!v || typeof v !== 'object') return 0;
  return toNumber(v.rate_percent ?? v.ratePercent ?? v.rate ?? 0);
};

export const getTaxJurisdictionId = (v) => {
  if (!v || typeof v !== 'object') return null;
  return v.tax_jurisdiction_id ?? v.taxJurisdiction?.id ?? v.tax_jurisdiction?.id ?? null;
};

export const isTaxInclusive = (v) => {
  if (!v || typeof v !== 'object') return false;
  return v.inclusive === true || v.inclusive === 1 || v.inclusive === '1';
};

export const getTaxLabel = (v) => {
  if (!v || typeof v !== 'object') return null;
  return v.name || v.code || null;
};

// Calculates per-line tax/discount/total. `row.tax_rate_id` may be either an id or a full tax object.
export const calculateLine = (l = {}) => {
  const qty = toNumber(l.qty);
  const unitPrice = toNumber(l.unit_price ?? l.rate);
  const gross = roundMoney(qty * unitPrice);
  const discPercent = Math.min(Math.max(toNumber(l.discount_percent), 0), 100);
  const discAmount = roundMoney(gross * discPercent / 100);
  const amountAfterDiscount = Math.max(gross - discAmount, 0);
  const taxObj = typeof l.tax_rate_id === 'object' ? l.tax_rate_id : (l.taxRate || l.tax_rate || null);
  const taxPercent = getTaxPercent(taxObj);
  let taxAmount = 0;
  let lineTotal = amountAfterDiscount;
  if (taxPercent > 0) {
    if (isTaxInclusive(taxObj)) {
      taxAmount = roundMoney(amountAfterDiscount - amountAfterDiscount / (1 + taxPercent / 100));
      lineTotal = amountAfterDiscount;
    } else {
      taxAmount = roundMoney(amountAfterDiscount * taxPercent / 100);
      lineTotal = amountAfterDiscount + taxAmount;
    }
  }
  const taxableAmount = (isTaxInclusive(taxObj) && taxPercent > 0)
    ? roundMoney(amountAfterDiscount - taxAmount)
    : amountAfterDiscount;
  return {
    gross: roundMoney(gross),
    discount_amount: discAmount,
    tax_jurisdiction_id: getTaxJurisdictionId(taxObj),
    tax_amount: taxAmount,
    taxable_amount: roundMoney(taxableAmount),
    tax_breakup: taxPercent > 0
      ? JSON.stringify({
          tax_rate_id: asId(taxObj),
          tax_name: getTaxLabel(taxObj),
          rate_percent: roundMoney(taxPercent),
          inclusive: isTaxInclusive(taxObj),
          taxable_amount: taxableAmount,
          tax_amount: taxAmount,
        })
      : null,
    line_total: roundMoney(lineTotal),
  };
};

export const calculateTotals = (items = []) => {
  let subtotal = 0;
  let discountTotal = 0;
  let taxableTotal = 0;
  let nonTaxableTotal = 0;
  let taxTotal = 0;
  let grandTotal = 0;
  (items || []).forEach((row) => {
    if (!row) return;
    const c = calculateLine(row);
    subtotal += c.gross;
    discountTotal += c.discount_amount;
    taxTotal += c.tax_amount;
    if (c.tax_amount > 0) taxableTotal += c.taxable_amount;
    else nonTaxableTotal += c.taxable_amount;
    grandTotal += c.line_total;
  });
  return {
    subtotal: roundMoney(subtotal),
    sub_total: roundMoney(subtotal),
    discount_total: roundMoney(discountTotal),
    taxable_total: roundMoney(taxableTotal),
    non_taxable_total: roundMoney(nonTaxableTotal),
    tax_total: roundMoney(taxTotal),
    vat_total: roundMoney(taxTotal),
    total: roundMoney(grandTotal),
    grand_total: roundMoney(grandTotal),
  };
};

export const emptyLine = {
  id: undefined,
  product_id: null,
  product_name: '',
  description: '',
  qty: 1,
  unit_price: 0,
  discount_percent: 0,
  discount_amount: 0,
  tax_rate_id: null,
  tax_jurisdiction_id: null,
  tax_amount: 0,
  tax_breakup: null,
  line_total: 0,
};

export const normalizeLine = (l = {}) => {
  const calc = calculateLine(l);
  return {
    ...(l.id ? { id: l.id } : {}),
    product_id: asId(l.product_id ?? l.product),
    product_name: cleanText(l.product_name ?? l.custom_product_name ?? ''),
    description: nullIfEmpty(l.description),
    qty: toNumber(l.qty) || 0,
    unit_price: toNumber(l.unit_price),
    discount_percent: toNumber(l.discount_percent),
    discount_amount: calc.discount_amount,
    tax_rate_id: asId(l.tax_rate_id ?? l.taxRate ?? l.tax_rate),
    tax_jurisdiction_id: calc.tax_jurisdiction_id || asId(l.tax_jurisdiction_id ?? l.taxJurisdiction),
    tax_amount: calc.tax_amount,
    tax_breakup: calc.tax_breakup,
    line_total: calc.line_total,
  };
};

export const money = (v) =>
  toNumber(v).toLocaleString('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const currencySymbolByCode = {
  NPR: 'रू',
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥',
  CNY: '¥',
};

// Pull a presentable symbol from a currency object (full record from /api/currencies/).
export const currencySymbolOf = (currency) => {
  if (!currency || typeof currency !== 'object') return '';
  return (
    currency.symbol ||
    currency.currency_symbol ||
    currencySymbolByCode[currency.code] ||
    currency.code ||
    ''
  );
};

// Format with symbol prefix, eg "रू 1,200.00"
export const moneyWithSymbol = (v, symbol = '') => {
  const m = money(v);
  return symbol ? `${symbol} ${m}` : m;
};
