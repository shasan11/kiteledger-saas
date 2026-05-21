import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { Col, InputNumber, Row, Select, Space } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const roundMoney = (v) => Number(toNumber(v).toFixed(2));
const money = (v) => toNumber(v).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyWithSymbol = (v, sym = 'रू') => `${sym ? `${sym} ` : ''}${money(v)}`;
const asId = (v) => { if (v === undefined || v === null || v === '') return null; if (typeof v === 'object') return v.id ?? v.value ?? null; return v; };
const cleanText = (v) => { if (v === undefined || v === null) return ''; return String(v); };
const nullIfEmpty = (v) => { if (v === undefined || v === null || v === '') return null; return v; };
const formatDate = (v) => {
  if (!v) return null;
  if (dayjs.isDayjs(v)) return v.isValid() ? v.format('YYYY-MM-DD') : null;
  const p = dayjs(v, ['YYYY-MM-DD', 'DD-MM-YYYY'], true);
  if (p.isValid()) return p.format('YYYY-MM-DD');
  const f = dayjs(v);
  return f.isValid() ? f.format('YYYY-MM-DD') : null;
};

const currencySymbolFromCode = { NPR: 'रू', USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', CAD: 'C$', JPY: '¥' };

const normalizeCurrencyResponse = (payload) => {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload[0] || null;
  if (Array.isArray(payload.results)) return payload.results[0] || null;
  if (typeof payload === 'object') { const vals = Object.values(payload); return vals.find((i) => i && typeof i === 'object') || null; }
  return null;
};

const getCurrencySymbol = (values = {}) => {
  const c = values?.currency_id ?? values?.currency ?? values?.currency_id_detail ?? values?.currency_detail;
  if (c && typeof c === 'object') return c.symbol || c.currency_symbol || currencySymbolFromCode[c.code] || c.code || 'रू';
  return 'रू';
};

const getTaxPercent = (v) => {
  if (!v) return 0;
  if (typeof v === 'object') return toNumber(v.rate_percent ?? v.ratePercent ?? v.rate ?? v.percent ?? v.percentage ?? v.tax_rate ?? v.vat_rate ?? v.tax_percent ?? v.taxPercent ?? v.taxClass?.rate_percent ?? v.tax_class?.rate_percent);
  return 0;
};
const getTaxJurisdictionId = (v) => { if (!v || typeof v !== 'object') return null; return v.tax_jurisdiction_id ?? v.taxJurisdiction?.id ?? v.tax_jurisdiction?.id ?? v.tax_jurisdiction_id_detail?.id ?? null; };
const isTaxInclusive = (v) => { if (!v || typeof v !== 'object') return false; return v.inclusive === true || v.inclusive === 1 || v.inclusive === '1' || v.inclusive === 'true'; };
const getTaxLabel = (v) => { if (!v || typeof v !== 'object') return null; return v.name || v.code || v.label || v.tax_class_name || v.taxClass?.name || v.tax_class?.name || null; };

const getDiscountType = (line = {}) => {
  if (line.discount_type === 'amount' || line.discount_type === 'percent') return line.discount_type;
  if (toNumber(line.discount_amount) > 0 && toNumber(line.discount_percent) <= 0) return 'amount';
  return 'percent';
};

const getDiscountValue = (line = {}) => {
  const dt = getDiscountType(line);
  const hasRV = line.discount_value !== undefined && line.discount_value !== null && line.discount_value !== '' && !(toNumber(line.discount_value) === 0 && (toNumber(line.discount_percent) > 0 || toNumber(line.discount_amount) > 0));
  if (hasRV) return toNumber(line.discount_value);
  return dt === 'amount' ? toNumber(line.discount_amount) : toNumber(line.discount_percent);
};

const getLineGross = (line = {}) => roundMoney(toNumber(line.qty) * toNumber(line.unit_price));

const calculateLine = (line = {}) => {
  const gross = getLineGross(line);
  const discountType = getDiscountType(line);
  const rawDiscount = getDiscountValue(line);
  let discountAmount = discountType === 'amount' ? rawDiscount : gross * (rawDiscount / 100);
  discountAmount = Math.max(0, Math.min(discountAmount, gross));
  const discountPercent = gross > 0 ? (discountAmount / gross) * 100 : 0;
  const taxObj = typeof line.tax_rate_id === 'object' ? line.tax_rate_id : (line.taxRate || line.tax_rate || null);
  const taxPercent = getTaxPercent(taxObj);
  const afterDiscount = Math.max(gross - discountAmount, 0);
  let taxableAmount = afterDiscount, taxAmount = 0, lineTotal = afterDiscount;
  if (taxPercent > 0) {
    if (isTaxInclusive(taxObj)) { taxAmount = afterDiscount - afterDiscount / (1 + taxPercent / 100); taxableAmount = afterDiscount - taxAmount; lineTotal = afterDiscount; }
    else { taxAmount = afterDiscount * (taxPercent / 100); lineTotal = afterDiscount + taxAmount; }
  } else { taxAmount = toNumber(line.tax_amount); lineTotal = afterDiscount + taxAmount; }
  const rTax = roundMoney(taxAmount), rTaxP = roundMoney(taxPercent), rTaxable = roundMoney(taxableAmount);
  return {
    gross: roundMoney(gross), discount_type: discountType, discount_value: roundMoney(rawDiscount),
    discount_percent: roundMoney(discountPercent), discount_amount: roundMoney(discountAmount),
    taxable_amount: rTaxable, tax_percent: rTaxP, tax_amount: rTax,
    tax_jurisdiction_id: getTaxJurisdictionId(taxObj),
    tax_breakup: taxPercent ? JSON.stringify({ tax_rate_id: asId(taxObj), tax_name: getTaxLabel(taxObj), rate_percent: rTaxP, inclusive: isTaxInclusive(taxObj), taxable_amount: rTaxable, tax_amount: rTax }) : null,
    line_total: roundMoney(lineTotal),
  };
};

const calculateSummary = (items = []) => {
  let subTotal = 0, discount = 0, nonTaxableTotal = 0, taxableTotal = 0, vat = 0;
  items.forEach((item) => {
    const c = calculateLine(item);
    subTotal += c.gross; discount += c.discount_amount; vat += c.tax_amount;
    if (asId(item.tax_rate_id) || c.tax_percent > 0 || c.tax_amount > 0) taxableTotal += c.taxable_amount;
    else nonTaxableTotal += c.taxable_amount;
  });
  return { subTotal: roundMoney(subTotal), discount: roundMoney(discount), nonTaxableTotal: roundMoney(nonTaxableTotal), taxableTotal: roundMoney(taxableTotal), vat: roundMoney(vat), grandTotal: roundMoney(subTotal - discount + vat) };
};

const normalizeLine = (line = {}) => {
  const c = calculateLine(line);
  return {
    ...(line.id ? { id: line.id } : {}),
    product_id: asId(line.product_id ?? line.product),
    product_name: cleanText(line.product_name),
    description: nullIfEmpty(line.description),
    qty: toNumber(line.qty),
    unit_price: toNumber(line.unit_price),
    discount_percent: c.discount_percent,
    discount_amount: c.discount_amount,
    tax_rate_id: asId(line.tax_rate_id ?? line.taxRate ?? line.tax_rate),
    tax_jurisdiction_id: c.tax_jurisdiction_id || asId(line.tax_jurisdiction_id ?? line.taxJurisdiction ?? line.tax_jurisdiction),
    tax_amount: c.tax_amount,
    tax_breakup: c.tax_breakup,
    line_total: c.line_total,
  };
};

const emptyLine = { id: undefined, product_id: null, product_name: '', description: '', qty: 1, unit_price: 0, discount_type: 'percent', discount_value: 0, discount_percent: 0, discount_amount: 0, tax_rate_id: null, tax_jurisdiction_id: null, tax_amount: 0, tax_breakup: null, line_total: 0 };

const categoryQuickAdd = {
  title: 'Category', buttonLabel: 'Add New Category', apiUrl: api('/api/product-categories/'),
  initialValues: { name: '', parent_id: null, description: '', active: true },
  validationSchema: Yup.object({ name: Yup.string().required('Category name is required') }),
  fields: [
    { name: 'name', label: 'Category Name', type: 'text', col: 24, required: true },
    { name: 'parent_id', label: 'Parent Category', type: 'fkSelect', col: 24, fkUrl: api('/api/product-categories/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', allowClear: true },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 2 },
  ],
  transformPayload: (v) => ({ name: nullIfEmpty(v.name), parent_id: asId(v.parent_id), description: nullIfEmpty(v.description), active: true }),
};

const productQuickAdd = {
  title: 'Product', buttonLabel: 'Add New Product', apiUrl: api('/api/products/'),
  initialValues: { type_of_product: 'goods', name: '', code: '', product_category_id: null, tax_class_id: null, product_unit_id: null, purchase_price: 0, selling_price: 0, allow_purchase: true, track_inventory: true, allow_sale: true, product_type: 'simple', valuation_method: 'standard', reorder_level: 0, description: '' },
  validationSchema: Yup.object({ type_of_product: Yup.string().required(), name: Yup.string().required('Product name is required'), product_category_id: Yup.mixed().required('Category is required'), product_unit_id: Yup.mixed().required('Primary unit is required') }),
  fields: [{
    type: 'group', label: '', col: 24, accordion: false, children: [
      { name: 'type_of_product', label: 'Type of Product', type: 'radio', col: 24, required: true, options: [{ value: 'goods', label: 'Goods' }, { value: 'services', label: 'Services' }] },
      { name: 'name', label: 'Name', type: 'text', col: 24, required: true },
      { name: 'code', label: 'Code', type: 'text', col: 12 },
      { name: 'product_category_id', label: 'Category', type: 'fkSelect', col: 12, required: true, fkUrl: api('/api/product-categories/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', allowClear: true, quickAdd: categoryQuickAdd },
      { name: 'tax_class_id', label: 'Tax', type: 'fkSelect', col: 12, fkUrl: api('/api/tax-classes/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', allowClear: true },
      { name: 'product_unit_id', label: 'Primary Unit', type: 'fkSelect', col: 12, required: true, fkUrl: api('/api/product-units/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', allowClear: true },
      { name: 'purchase_price', label: 'Purchase Price', type: 'number', col: 12, min: 0 },
      { name: 'selling_price', label: 'Selling Price', type: 'number', col: 12, min: 0 },
      { name: 'allow_purchase', label: 'Available For Purchase', type: 'switch', col: 12 },
    ],
  }],
  transformPayload: (v) => {
    const isService = v.type_of_product === 'services';
    return { name: nullIfEmpty(v.name), code: nullIfEmpty(v.code), product_category_id: asId(v.product_category_id), product_unit_id: asId(v.product_unit_id), tax_class_id: asId(v.tax_class_id), product_type: v.product_type || 'simple', valuation_method: isService ? 'standard' : v.valuation_method || 'standard', reorder_level: isService ? 0 : toNumber(v.reorder_level), purchase_price: toNumber(v.purchase_price), selling_price: toNumber(v.selling_price), track_inventory: isService ? false : !!v.track_inventory, allow_sale: v.allow_sale !== false, allow_purchase: isService ? false : v.allow_purchase !== false, active: true, description: nullIfEmpty(v.description) };
  },
};

const warehouseQuickAdd = {
  title: 'Warehouse', buttonLabel: 'Add New Warehouse', apiUrl: api('/api/warehouses/'),
  initialValues: { name: '', code: '', address: '', active: true },
  validationSchema: Yup.object({ name: Yup.string().required('Warehouse name is required') }),
  fields: [
    { name: 'name', label: 'Name', type: 'text', col: 24, required: true },
    { name: 'code', label: 'Code', type: 'text', col: 12 },
    { name: 'address', label: 'Address', type: 'textarea', col: 24, rows: 2 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ],
  transformPayload: (v) => ({ name: nullIfEmpty(v.name), code: nullIfEmpty(v.code), address: nullIfEmpty(v.address), active: v.active !== false }),
};

function LineDiscountInput({ rowValue, readOnly, recomputeRow }) {
  const row = rowValue || {};
  const discountType = getDiscountType(row);
  const gross = getLineGross(row);
  const value = getDiscountValue(row);

  const handleTypeChange = (nextType) => {
    const currentAmt = calculateLine(row).discount_amount;
    if (nextType === 'amount') {
      recomputeRow({ discount_type: 'amount', discount_value: currentAmt, discount_amount: currentAmt, discount_percent: gross > 0 ? roundMoney((currentAmt / gross) * 100) : 0 });
    } else {
      const pct = gross > 0 ? roundMoney((currentAmt / gross) * 100) : 0;
      recomputeRow({ discount_type: 'percent', discount_value: pct, discount_percent: pct, discount_amount: currentAmt });
    }
  };

  const handleValueChange = (nextValue) => {
    const cv = toNumber(nextValue);
    if (discountType === 'amount') {
      const amt = Math.min(cv, gross);
      recomputeRow({ discount_type: 'amount', discount_value: amt, discount_amount: amt, discount_percent: gross > 0 ? roundMoney((amt / gross) * 100) : 0 });
    } else {
      const pct = Math.min(cv, 100);
      recomputeRow({ discount_type: 'percent', discount_value: pct, discount_percent: pct, discount_amount: roundMoney(gross * (pct / 100)) });
    }
  };

  return (
    <Space.Compact style={{ width: '100%' }}>
      <Select value={discountType} disabled={readOnly} style={{ width: 76 }} onChange={handleTypeChange} options={[{ value: 'percent', label: '%' }, { value: 'amount', label: 'Amt' }]} />
      <InputNumber value={value} min={0} max={discountType === 'percent' ? 100 : gross} disabled={readOnly} style={{ width: '100%' }} onChange={handleValueChange} />
    </Space.Compact>
  );
}

const PurchaseBillTotals = ({ values = {} }) => {
  const summary = calculateSummary(values.items || []);
  const symbol = getCurrencySymbol(values);
  return (
    <Row style={{ marginTop: 0 }}>
      <Col xs={24}>
        <div className="purchase-bill-total-card">
          <div className="purchase-bill-total-row"><span>Sub Total</span><strong>{moneyWithSymbol(summary.subTotal, symbol)}</strong></div>
          <div className="purchase-bill-total-row"><span>Discount</span><strong>{summary.discount > 0 ? moneyWithSymbol(summary.discount, symbol) : '-'}</strong></div>
          <div className="purchase-bill-total-row"><span>Non-Taxable Total</span><strong>{summary.nonTaxableTotal > 0 ? moneyWithSymbol(summary.nonTaxableTotal, symbol) : '-'}</strong></div>
          <div className="purchase-bill-total-row"><span>Taxable Total</span><strong>{summary.taxableTotal > 0 ? moneyWithSymbol(summary.taxableTotal, symbol) : '-'}</strong></div>
          <div className="purchase-bill-total-row"><span>VAT</span><strong>{summary.vat > 0 ? moneyWithSymbol(summary.vat, symbol) : '-'}</strong></div>
          <div className="purchase-bill-total-row purchase-bill-total-grand"><span>Grand Total</span><strong>{moneyWithSymbol(summary.grandTotal, symbol)}</strong></div>
        </div>
      </Col>
    </Row>
  );
};

const visitPurchaseBillShow = (id) => {
  if (!id) return;
  if (typeof route === 'function') { router.visit(route('payment-out.purchase-bills.show', id)); return; }
  router.visit(`/payment-out/purchase-bills/${id}`);
};

export default function PurchaseBillAdd(props) {
  const [baseCurrency, setBaseCurrency] = useState(null);
  const [prefillData, setPrefillData] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('kiteledger_bill_prefill');
      if (raw) {
        sessionStorage.removeItem('kiteledger_bill_prefill');
        setPrefillData(JSON.parse(raw));
      }
    } catch {}
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    fetch(api('/api/currencies/?is_base=true&active=true&page_size=1'), { headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => { const c = normalizeCurrencyResponse(payload); if (c?.id) setBaseCurrency(c); })
      .catch(() => {});
  }, []);

  const fields = useMemo(() => [
    {
      name: 'contact_id', label: 'Supplier', type: 'fkSelect', required: true, col: 16,
      placeholder: 'Select Supplier', fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
      quickAdd: {
        title: 'Supplier', buttonLabel: 'Add New Supplier', apiUrl: api('/api/contacts/'),
        initialValues: { contact_type: 'supplier', type: 'supplier', name: '', phone: '', email: '', address: '', active: true },
        validationSchema: Yup.object({ name: Yup.string().required('Supplier name is required') }),
        fields: [
          { name: 'name', label: 'Supplier Name', type: 'text', col: 24, required: true },
          { name: 'phone', label: 'Phone', type: 'phone', col: 12, defaultCountryCode: '+977' },
          { name: 'email', label: 'Email', type: 'text', col: 12 },
          { name: 'address', label: 'Address', type: 'textarea', col: 24, rows: 2 },
        ],
        transformPayload: (v) => ({ ...v, contact_type: v.contact_type || 'supplier', type: v.type || 'supplier', active: true }),
      },
    },
    { name: 'bill_no', label: 'Bill No', type: 'text', col: 8, placeholder: 'Auto-generated', disabled: true },
    { name: 'bill_date', label: 'Bill Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY' },
    { name: 'due_date', label: 'Due Date', type: 'datePicker', col: 8, format: 'DD-MM-YYYY' },
    {
      name: 'warehouse_id', label: 'Warehouse', type: 'fkSelect', col: 8,
      placeholder: 'Select Warehouse', fkUrl: api('/api/warehouses/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', allowClear: true,
      quickAdd: warehouseQuickAdd,
      help: 'Selecting a warehouse will add stock to this warehouse when the purchase bill is approved.',
    },
    {
      name: 'currency_id', label: 'Currency', type: 'fkSelect', col: 8,
      placeholder: 'Currency', fkUrl: api('/api/currencies/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
      storeFullObject: true, fkLabel: (r) => [r?.code, r?.symbol, r?.name].filter(Boolean).join(' - '),
      onSelectRecord: (r, v) => ({ ...v, currency_id: r, exchange_rate: toNumber(r?.exchange_rate) || toNumber(v?.exchange_rate) || 1 }),
    },
    { name: 'exchange_rate', label: 'Exchange Rate To NPR', type: 'number', required: true, col: 8, min: 0.000001 },
    { name: 'reference', label: 'Reference', type: 'text', col: 8, placeholder: 'Reference' },
    {
      name: 'items', label: '', type: 'objectArray', col: 24,
      addButtonLabel: 'Add Product / Service', defaultItem: { ...emptyLine },
      headerBg: '#4b5563', headerColor: '#ffffff', rowStartExpanded: false,
      recalculateRow: (row) => {
        const c = calculateLine(row);
        return { ...row, discount_type: c.discount_type, discount_value: c.discount_value, discount_percent: c.discount_percent, discount_amount: c.discount_amount, tax_jurisdiction_id: c.tax_jurisdiction_id, tax_amount: c.tax_amount, tax_breakup: c.tax_breakup, line_total: c.line_total };
      },
      columns: [
        {
          key: 'product_id', name: 'product_id', label: 'Product / Service', type: 'fkSelect', width: '20%',
          placeholder: 'Add Code or Product', fkUrl: api('/api/products/search?transaction=purchase'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'label',
          labelField: 'product_name', quickAdd: productQuickAdd,
          fkLabel: (r) => [r?.code || r?.sku || '', r?.name || ''].filter(Boolean).join(' - '),
          fkOptionRender: (r) => (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, width: '100%' }}>
              <span>{r?.name || ''}</span>
              <span style={{ opacity: 0.75 }}>{[r?.code || r?.sku || '', r?.type_of_product === 'services' ? 'Service' : 'Product'].filter(Boolean).join(' • ')}</span>
            </div>
          ),
          onSelectRecord: (r, row) => {
            const unitPrice = toNumber(r?.purchase_price ?? r?.price ?? row?.unit_price);
            const defaultTaxRate = r?.default_tax_rate ?? null;
            const baseRow = { ...row, product_id: r?.id ?? null, product_name: r?.name || '', description: row?.description || r?.description || '', unit_price: unitPrice, tax_rate_id: defaultTaxRate ?? row.tax_rate_id ?? null, tax_jurisdiction_id: defaultTaxRate ? getTaxJurisdictionId(defaultTaxRate) : (row.tax_jurisdiction_id ?? null) };
            const c = calculateLine(baseRow);
            return { ...baseRow, tax_amount: c.tax_amount, tax_breakup: c.tax_breakup, line_total: c.line_total };
          },
        },
        { key: 'qty', name: 'qty', label: 'Qty', type: 'number', width: '10%', min: 0.000001 },
        { key: 'unit_price', name: 'unit_price', label: 'Rate', type: 'number', width: '15%', min: 0, prefix: ({ values }) => getCurrencySymbol(values) },
        { key: 'discount_value', name: 'discount_value', label: 'Discount', type: 'custom', width: '15%', component: LineDiscountInput },
        {
          key: 'tax_rate_id', name: 'tax_rate_id', label: 'Tax', type: 'fkSelect', width: '15%',
          placeholder: 'No VAT', fkUrl: api('/api/tax-rates/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name',
          storeFullObject: true, fkLabel: (r) => [r?.name, r?.rate_percent ? `${toNumber(r.rate_percent)}%` : null].filter(Boolean).join(' - '),
          onSelectRecord: (r, row) => {
            const c = calculateLine({ ...row, tax_rate_id: r, tax_jurisdiction_id: getTaxJurisdictionId(r) });
            return { ...row, tax_rate_id: r, tax_jurisdiction_id: c.tax_jurisdiction_id, tax_amount: c.tax_amount, tax_breakup: c.tax_breakup, line_total: c.line_total };
          },
        },
        { key: 'line_total', name: 'line_total', label: 'Amount', type: 'number', width: '13%', min: 0, disabled: true, addonBefore: ({ values }) => getCurrencySymbol(values), prefix: ({ values }) => getCurrencySymbol(values), formula: (row) => calculateLine(row).line_total },
      ],
      collapsedFields: [
        { key: 'description', name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 2, placeholder: 'Line description' },
      ],
    },
    { name: 'notes', label: 'Notes', type: 'textarea', col: 12, rows: 5, placeholder: 'Notes', help: 'This will appear on print' },
    { name: '_purchase_bill_totals', label: '', type: 'custom', col: 12, render: ({ values }) => <PurchaseBillTotals values={values} /> },
  ], [baseCurrency]);

  const validationSchema = useMemo(() => Yup.object().shape({
    contact_id: Yup.mixed().test('req', 'Supplier is required', (v) => !!asId(v)).required('Supplier is required'),
    bill_date: Yup.mixed().required('Date is required'),
    exchange_rate: Yup.number().typeError('Exchange rate required').moreThan(0, 'Must be > 0').required('Required'),
    items: Yup.array().of(
      Yup.object().shape({
        qty: Yup.number().typeError('Qty must be a number').moreThan(0, 'Qty must be > 0').required('Required'),
        unit_price: Yup.number().typeError('Rate must be a number').min(0).required('Required'),
        discount_type: Yup.string().oneOf(['percent', 'amount']).default('percent'),
        discount_value: Yup.number().min(0).nullable(),
        discount_percent: Yup.number().nullable(),
        discount_amount: Yup.number().nullable(),
        tax_amount: Yup.number().min(0).nullable(),
        line_total: Yup.number().min(0).nullable(),
      }).test('product-or-name', 'Product is required', (l) => !!asId(l?.product_id) || !!cleanText(l?.product_name).trim())
    ).min(1, 'At least one item is required').required('Required'),
  }), []);

  const crudInitialValues = useMemo(() => {
    const base = {
      bill_no: null, bill_date: dayjs(), due_date: null,
      contact_id: null, warehouse_id: null,
      currency_id: baseCurrency, exchange_rate: toNumber(baseCurrency?.exchange_rate) || 1,
      reference: '', notes: '',
      items: [{ ...emptyLine }], deleted_item_ids: [],
    };
    if (!prefillData) return base;
    const items = Array.isArray(prefillData.items) && prefillData.items.length > 0
      ? prefillData.items.map((line) => ({
          ...emptyLine,
          product_id: line.product_id_detail ?? line.product_id ?? null,
          product_name: line.product_name ?? '',
          description: line.description ?? '',
          qty: toNumber(line.qty) || 1,
          unit_price: toNumber(line.unit_price),
          discount_type: 'percent',
          discount_value: toNumber(line.discount_percent ?? 0),
          discount_percent: toNumber(line.discount_percent ?? 0),
          discount_amount: toNumber(line.discount_amount ?? 0),
          tax_rate_id: line.tax_rate_id_detail ?? line.tax_rate_id ?? null,
          tax_amount: toNumber(line.tax_amount ?? 0),
          line_total: toNumber(line.line_total ?? 0),
        }))
      : [{ ...emptyLine }];
    const prefillCurrency = prefillData.currency_id_detail ?? null;
    return {
      ...base,
      contact_id: prefillData.contact_id_detail ?? prefillData.contact_id ?? null,
      currency_id: prefillCurrency ?? baseCurrency,
      exchange_rate: toNumber(prefillData.exchange_rate) || toNumber(baseCurrency?.exchange_rate) || 1,
      reference: prefillData.reference ?? '',
      notes: prefillData.notes ?? '',
      items,
    };
  }, [baseCurrency, prefillData]);

  const transformPayload = (values = {}) => {
    const rawItems = Array.isArray(values.items) ? values.items : [];
    const items = rawItems.map(normalizeLine).filter((l) => !!asId(l.product_id) || !!cleanText(l.product_name).trim());
    const summary = calculateSummary(items);
    return {
      bill_no: nullIfEmpty(values.bill_no),
      bill_date: formatDate(values.bill_date),
      due_date: formatDate(values.due_date),
      contact_id: asId(values.contact_id ?? values.contact),
      warehouse_id: asId(values.warehouse_id ?? values.warehouse),
      currency_id: asId(values.currency_id ?? values.currency),
      exchange_rate: toNumber(values.exchange_rate) || 1,
      reference: nullIfEmpty(values.reference),
      notes: nullIfEmpty(values.notes),
      total: summary.grandTotal,
      items,
      deleted_item_ids: Array.isArray(values.deleted_item_ids) ? values.deleted_item_ids.filter(Boolean) : [],
    };
  };

  return (
    <AuthenticatedLayout auth={props.auth} user={props.auth?.user}>
      <Head title="New Purchase Bill" />
      <style>{`
        .purchase-bill-form-drawer .ant-drawer-content { background: #ffffff; }
        .purchase-bill-form-drawer .ant-drawer-header { min-height: 38px; padding: 0 14px; border-bottom: 1px solid #d9dee7; background: #ffffff; }
        .purchase-bill-form-drawer .ant-drawer-title { font-size: 14px; font-weight: 700; color: #1f2937; }
        .purchase-bill-form-drawer .ant-drawer-body { padding: 12px 14px 24px; background: #ffffff; }
        .purchase-bill-form-drawer .ant-form { max-width: 100%; margin: 0; padding: 0; }
        .purchase-bill-form-drawer .ant-form-item { margin-bottom: 12px; }
        .purchase-bill-form-drawer .ant-form-item-label { padding-bottom: 3px; }
        .purchase-bill-form-drawer .ant-form-item-label > label { height: auto; font-size: 12px; font-weight: 600; color: #1f2937; }
        .purchase-bill-form-drawer .ant-input, .purchase-bill-form-drawer .ant-input-number, .purchase-bill-form-drawer .ant-picker, .purchase-bill-form-drawer .ant-select-selector { min-height: 31px; border-radius: 0 !important; border-color: #cbd5e1 !important; background: #ffffff; box-shadow: none !important; }
        .purchase-bill-form-drawer .ant-input-number { width: 100%; }
        .purchase-bill-form-drawer textarea.ant-input { min-height: 76px; resize: vertical; }
        .purchase-bill-form-drawer .ant-input[disabled], .purchase-bill-form-drawer .ant-input-number-disabled, .purchase-bill-form-drawer .ant-select-disabled .ant-select-selector { color: #111827; background: #eef2f7 !important; }
        .purchase-bill-form-drawer .ant-btn-primary { min-width: 88px; height: 31px; border-radius: 0; background: #2563eb; border-color: #2563eb; font-weight: 700; }
        .purchase-bill-form-drawer .ant-btn-primary:hover { background: #1d4ed8 !important; border-color: #1d4ed8 !important; }
        .purchase-bill-form-drawer .ant-btn { border-radius: 0; }
        .purchase-bill-form-drawer .ant-table { border: 1px solid #cbd5e1; border-radius: 0; }
        .purchase-bill-form-drawer .ant-table-thead > tr > th { background: #4b5563 !important; color: #ffffff !important; font-size: 12px; font-weight: 700; border-bottom: 0; }
        .purchase-bill-form-drawer .ant-table-tbody > tr > td { padding: 7px 10px; vertical-align: top; }
        .purchase-bill-form-drawer .ant-table-tbody .ant-form-item { margin-bottom: 0; }
        .purchase-bill-total-card { border: 1px solid #d8dee8; background: #eef2f8; }
        .purchase-bill-total-row { display: flex; justify-content: space-between; gap: 16px; padding: 9px 12px; font-size: 13px; color: #111827; }
        .purchase-bill-total-row strong { font-weight: 600; }
        .purchase-bill-total-grand { margin-top: 8px; padding-top: 14px; padding-bottom: 14px; border-top: 1px solid #d8dee8; font-size: 15px; font-weight: 700; }
        .purchase-bill-total-grand strong { font-size: 18px; }
      `}</style>
      <ReusableCrud
        key={prefillData?._source_id ?? baseCurrency?.id ?? 'purchase-bill-add'}
        className="purchase-bill-crud"
        drawerClassName="purchase-bill-form-drawer"
        title="Purchase Bills"
        addTitle="New Purchase Bill"
        apiUrl={api('/api/purchase-bills/')}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        ui_type="add form"
        drawerWidth="100vw"
        onAddSuccess={(record) => { if (record?.id) visitPurchaseBillShow(record.id); }}
      />
    </AuthenticatedLayout>
  );
}
