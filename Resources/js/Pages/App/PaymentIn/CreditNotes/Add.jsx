import { useEffect, useMemo, useState } from 'react';
import { Col, InputNumber, Row, Select, Space } from 'antd';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const roundMoney = (value) => Number(toNumber(value).toFixed(2));

const money = (value) =>
  toNumber(value).toLocaleString('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const currencySymbolFromCode = {
  NPR: 'रू',
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥',
};

const normalizeCurrencyResponse = (payload) => {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload[0] || null;
  if (Array.isArray(payload.results)) return payload.results[0] || null;

  if (typeof payload === 'object') {
    const values = Object.values(payload);
    return values.find((item) => item && typeof item === 'object') || null;
  }

  return null;
};

const getCurrencySymbol = (values = {}) => {
  const currency =
    values?.currency_id ??
    values?.currency ??
    values?.currency_id_detail ??
    values?.currency_detail;

  if (currency && typeof currency === 'object') {
    return (
      currency.symbol ||
      currency.currency_symbol ||
      currencySymbolFromCode[currency.code] ||
      currency.code ||
      'रू'
    );
  }

  return 'रू';
};

const moneyWithSymbol = (value, symbol = 'रू') =>
  `${symbol ? `${symbol} ` : ''}${money(value)}`;

const asId = (value) => {
  if (value === undefined || value === null || value === '') return null;

  if (typeof value === 'object') {
    return value.id ?? value.value ?? null;
  }

  return value;
};

const cleanText = (value) => {
  if (value === undefined || value === null) return '';
  return String(value);
};

const nullIfEmpty = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return value;
};

const formatDate = (value) => {
  if (!value) return null;

  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value.format('YYYY-MM-DD') : null;
  }

  const parsed = dayjs(value, ['YYYY-MM-DD', 'DD-MM-YYYY'], true);

  if (parsed.isValid()) {
    return parsed.format('YYYY-MM-DD');
  }

  const fallback = dayjs(value);

  return fallback.isValid() ? fallback.format('YYYY-MM-DD') : null;
};

const getTaxPercent = (value) => {
  if (!value) return 0;

  if (typeof value === 'object') {
    return toNumber(
      value.rate_percent ??
        value.ratePercent ??
        value.rate ??
        value.percent ??
        value.percentage ??
        value.tax_rate ??
        value.vat_rate ??
        value.tax_percent ??
        value.taxPercent ??
        value.taxClass?.rate_percent ??
        value.tax_class?.rate_percent
    );
  }

  return 0;
};

const getTaxJurisdictionId = (value) => {
  if (!value || typeof value !== 'object') return null;

  return (
    value.tax_jurisdiction_id ??
    value.taxJurisdiction?.id ??
    value.tax_jurisdiction?.id ??
    value.tax_jurisdiction_id_detail?.id ??
    null
  );
};

const isTaxInclusive = (value) => {
  if (!value || typeof value !== 'object') return false;

  return (
    value.inclusive === true ||
    value.inclusive === 1 ||
    value.inclusive === '1' ||
    value.inclusive === 'true'
  );
};

const getTaxLabel = (value) => {
  if (!value || typeof value !== 'object') return null;

  return (
    value.name ||
    value.code ||
    value.label ||
    value.tax_class_name ||
    value.taxClass?.name ||
    value.tax_class?.name ||
    null
  );
};

const emptyLine = {
  id: undefined,

  product_id: null,
  product_name: '',
  description: '',

  qty: 1,
  unit_price: 0,

  discount_type: 'percent',
  discount_value: 0,
  discount_percent: 0,
  discount_amount: 0,

  tax_rate_id: null,
  tax_jurisdiction_id: null,
  tax_percent: 0,
  tax_amount: 0,
  tax_breakup: null,

  line_total: 0,
};

const calculateLine = (line = {}) => {
  const qty = toNumber(line.qty);
  const rate = toNumber(line.unit_price);
  const gross = qty * rate;

  const discountType = line.discount_type || 'percent';

  const rawDiscountValue =
    line.discount_value !== undefined &&
    line.discount_value !== null &&
    line.discount_value !== ''
      ? toNumber(line.discount_value)
      : toNumber(line.discount_percent);

  let discountAmount =
    discountType === 'amount'
      ? rawDiscountValue
      : gross * (rawDiscountValue / 100);

  discountAmount = Math.max(0, Math.min(discountAmount, gross));

  const discountPercent = gross > 0 ? (discountAmount / gross) * 100 : 0;

  const taxObject =
    typeof line.tax_rate_id === 'object'
      ? line.tax_rate_id
      : line.taxRate || line.tax_rate || null;

  const taxPercent = toNumber(line.tax_percent) || getTaxPercent(taxObject);

  const amountAfterDiscount = Math.max(gross - discountAmount, 0);

  let taxableAmount = amountAfterDiscount;
  let taxAmount = 0;
  let lineTotal = amountAfterDiscount;

  if (taxPercent > 0) {
    if (isTaxInclusive(taxObject)) {
      taxAmount =
        amountAfterDiscount - amountAfterDiscount / (1 + taxPercent / 100);
      taxableAmount = amountAfterDiscount - taxAmount;
      lineTotal = amountAfterDiscount;
    } else {
      taxAmount = amountAfterDiscount * (taxPercent / 100);
      taxableAmount = amountAfterDiscount;
      lineTotal = amountAfterDiscount + taxAmount;
    }
  }

  const roundedTaxableAmount = roundMoney(taxableAmount);
  const roundedTaxAmount = roundMoney(taxAmount);
  const roundedTaxPercent = roundMoney(taxPercent);

  return {
    gross: roundMoney(gross),
    discount_type: discountType,
    discount_value: roundMoney(rawDiscountValue),
    discount_percent: roundMoney(discountPercent),
    discount_amount: roundMoney(discountAmount),
    taxable_amount: roundedTaxableAmount,
    tax_percent: roundedTaxPercent,
    tax_amount: roundedTaxAmount,
    tax_jurisdiction_id: getTaxJurisdictionId(taxObject),
    tax_breakup: taxPercent
      ? JSON.stringify({
          tax_rate_id: asId(taxObject),
          tax_name: getTaxLabel(taxObject),
          rate_percent: roundedTaxPercent,
          inclusive: isTaxInclusive(taxObject),
          taxable_amount: roundedTaxableAmount,
          tax_amount: roundedTaxAmount,
        })
      : null,
    line_total: roundMoney(lineTotal),
  };
};

const calculateSummary = (items = []) => {
  let subTotal = 0;
  let discount = 0;
  let nonTaxableTotal = 0;
  let taxableTotal = 0;
  let vat = 0;

  items.forEach((item) => {
    const calculated = calculateLine(item);

    subTotal += calculated.gross;
    discount += calculated.discount_amount;
    vat += calculated.tax_amount;

    if (
      asId(item.tax_rate_id) ||
      calculated.tax_percent > 0 ||
      calculated.tax_amount > 0
    ) {
      taxableTotal += calculated.taxable_amount;
    } else {
      nonTaxableTotal += calculated.taxable_amount;
    }
  });

  return {
    subTotal: roundMoney(subTotal),
    discount: roundMoney(discount),
    nonTaxableTotal: roundMoney(nonTaxableTotal),
    taxableTotal: roundMoney(taxableTotal),
    vat: roundMoney(vat),
    grandTotal: roundMoney(subTotal - discount + vat),
  };
};

const normalizeLine = (line = {}) => {
  const calculated = calculateLine(line);

  return {
    ...(line.id ? { id: line.id } : {}),
    product_id: asId(line.product_id ?? line.product),
    product_name: cleanText(line.product_name),
    description: nullIfEmpty(line.description),
    qty: toNumber(line.qty),
    unit_price: toNumber(line.unit_price),
    discount_percent: calculated.discount_percent,
    discount_amount: calculated.discount_amount,
    tax_rate_id: asId(line.tax_rate_id ?? line.taxRate ?? line.tax_rate),
    tax_jurisdiction_id: calculated.tax_jurisdiction_id || asId(line.tax_jurisdiction_id ?? line.taxJurisdiction ?? line.tax_jurisdiction),
    tax_amount: calculated.tax_amount,
    tax_breakup: calculated.tax_breakup,
    line_total: calculated.line_total,
  };
};

const categoryQuickAdd = {
  title: 'Category',
  buttonLabel: 'Add New Category',
  apiUrl: api('/api/product-categories/'),
  initialValues: {
    name: '',
    parent_id: null,
    description: '',
    active: true,
  },
  validationSchema: Yup.object({
    name: Yup.string().required('Category name is required'),
  }),
  fields: [
    {
      name: 'name',
      label: 'Category Name',
      type: 'text',
      col: 24,
      required: true,
      placeholder: 'Category Name',
    },
    {
      name: 'parent_id',
      label: 'Parent Category',
      type: 'fkSelect',
      col: 24,
      placeholder: 'Parent Category',
      fkUrl: api('/api/product-categories/'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
      allowClear: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      col: 24,
      rows: 2,
    },
  ],
  transformPayload: (values) => ({
    name: nullIfEmpty(values.name),
    parent_id: asId(values.parent_id),
    description: nullIfEmpty(values.description),
    active: true,
  }),
};

const productQuickAdd = {
  title: 'Product',
  buttonLabel: 'Add New Product',
  apiUrl: api('/api/products/'),

  initialValues: {
    type_of_product: 'goods',
    name: '',
    code: '',
    product_category_id: null,
    tax_class_id: null,
    product_unit_id: null,
    purchase_price: 0,
    selling_price: 0,
    allow_sale: true,
    parent_id: null,
    sku: '',
    barcode: '',
    product_tax_category_id: null,
    reorder_level: 0,
    product_type: 'simple',
    valuation_method: 'standard',
    track_inventory: true,
    allow_purchase: true,
    sales_account_id: null,
    purchase_account_id: null,
    sales_return_account_id: null,
    purchase_return_account_id: null,
    description: '',
  },

  validationSchema: Yup.object({
    type_of_product: Yup.string().required('Type of product is required'),
    name: Yup.string().required('Product name is required'),
    product_category_id: Yup.mixed().required('Category is required'),
    product_unit_id: Yup.mixed().required('Primary unit is required'),
  }),

  fields: [
    {
      type: 'group',
      label: '',
      col: 24,
      accordion: false,
      children: [
        {
          name: 'type_of_product',
          label: 'Type of Product',
          type: 'radio',
          col: 24,
          required: true,
          options: [
            { value: 'goods', label: 'Goods' },
            { value: 'services', label: 'Services' },
          ],
        },
        {
          name: 'name',
          label: 'Name',
          type: 'text',
          col: 24,
          required: true,
          placeholder: 'Name',
        },
        {
          name: 'code',
          label: 'Code',
          type: 'text',
          col: 12,
          placeholder: 'Code',
        },
        {
          name: 'product_category_id',
          label: 'Category',
          type: 'fkSelect',
          col: 12,
          required: true,
          placeholder: 'Category Name',
          fkUrl: api('/api/product-categories/'),
          fkSearchParam: 'search',
          fkPageSize: 20,
          fkValueKey: 'id',
          fkLabelKey: 'name',
          allowClear: true,
          quickAdd: categoryQuickAdd,
        },
        {
          name: 'tax_class_id',
          label: 'Tax',
          type: 'fkSelect',
          col: 12,
          placeholder: 'No VAT',
          fkUrl: api('/api/tax-classes/'),
          fkSearchParam: 'search',
          fkPageSize: 20,
          fkValueKey: 'id',
          fkLabelKey: 'name',
          allowClear: true,
        },
        {
          name: 'product_unit_id',
          label: 'Primary Unit',
          type: 'fkSelect',
          col: 12,
          required: true,
          placeholder: 'Primary Unit',
          fkUrl: api('/api/product-units/'),
          fkSearchParam: 'search',
          fkPageSize: 20,
          fkValueKey: 'id',
          fkLabelKey: 'name',
          allowClear: true,
        },
        {
          name: 'purchase_price',
          label: 'Purchase Price',
          type: 'number',
          col: 12,
          min: 0,
          placeholder: 'Purchase Price',
        },
        {
          name: 'selling_price',
          label: 'Selling Price',
          type: 'number',
          col: 12,
          min: 0,
          placeholder: 'Selling Price',
        },
        {
          name: 'allow_sale',
          label: 'Available For Sale',
          type: 'switch',
          col: 12,
        },
      ],
    },
  ],

  transformPayload: (values) => {
    const isService = values.type_of_product === 'services';

    return {
      name: nullIfEmpty(values.name),
      code: nullIfEmpty(values.code),
      sku: nullIfEmpty(values.sku),
      barcode: nullIfEmpty(values.barcode),

      parent_id: asId(values.parent_id),
      product_category_id: asId(values.product_category_id),
      product_unit_id: asId(values.product_unit_id),
      product_tax_category_id: asId(values.product_tax_category_id),
      tax_class_id: asId(values.tax_class_id),

      sales_account_id: asId(values.sales_account_id),
      purchase_account_id: asId(values.purchase_account_id),
      sales_return_account_id: asId(values.sales_return_account_id),
      purchase_return_account_id: asId(values.purchase_return_account_id),

      product_type: values.product_type || 'simple',
      valuation_method: isService ? 'standard' : values.valuation_method || 'standard',

      reorder_level: isService ? 0 : toNumber(values.reorder_level),
      purchase_price: toNumber(values.purchase_price),
      selling_price: toNumber(values.selling_price),

      track_inventory: isService ? false : !!values.track_inventory,
      allow_sale: values.allow_sale !== false,
      allow_purchase: isService ? false : values.allow_purchase !== false,

      active: true,
      description: nullIfEmpty(values.description),
    };
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

const CreditNoteTotals = ({ values = {} }) => {
  const summary = calculateSummary(values.items || []);
  const symbol = getCurrencySymbol(values);

  return (
    <Row style={{ marginTop: 0 }}>
      <Col xs={24}>
        <div className="credit-note-total-card">
          <div className="credit-note-total-row">
            <span>Sub Total</span>
            <strong>{moneyWithSymbol(summary.subTotal, symbol)}</strong>
          </div>

          <div className="credit-note-total-row">
            <span>Discount</span>
            <strong>
              {summary.discount > 0 ? moneyWithSymbol(summary.discount, symbol) : '-'}
            </strong>
          </div>

          <div className="credit-note-total-row">
            <span>Non-Taxable Total</span>
            <strong>
              {summary.nonTaxableTotal > 0
                ? moneyWithSymbol(summary.nonTaxableTotal, symbol)
                : '-'}
            </strong>
          </div>

          <div className="credit-note-total-row">
            <span>Taxable Total</span>
            <strong>
              {summary.taxableTotal > 0
                ? moneyWithSymbol(summary.taxableTotal, symbol)
                : '-'}
            </strong>
          </div>

          <div className="credit-note-total-row">
            <span>VAT</span>
            <strong>{summary.vat > 0 ? moneyWithSymbol(summary.vat, symbol) : '-'}</strong>
          </div>

          <div className="credit-note-total-row credit-note-total-grand">
            <span>Credit Total</span>
            <strong>{moneyWithSymbol(summary.grandTotal, symbol)}</strong>
          </div>
        </div>
      </Col>
    </Row>
  );
};

const visitCreditNoteShow = (id) => {
  if (!id) return;

  if (typeof route === 'function') {
    router.visit(route('payment-in.credit-notes.show', id));
    return;
  }

  router.visit(`/payment-in/credit-notes/${id}`);
};

export default function CreditNoteAdd(props) {
  const [baseCurrency, setBaseCurrency] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    fetch(api('/api/currencies/?is_base=true&active=true&page_size=1'), {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        const currency = normalizeCurrencyResponse(payload);

        if (currency?.id) {
          setBaseCurrency(currency);
        }
      })
      .catch(() => {});
  }, []);

  const fields = useMemo(
    () => [
      {
        name: 'contact_id',
        label: 'Customer Name',
        type: 'fkSelect',
        required: true,
        col: 16,
        placeholder: 'Select Customer',
        fkUrl: api('/api/contacts/'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'name',

        quickAdd: {
          title: 'Customer',
          buttonLabel: 'Add New Customer',
          apiUrl: api('/api/contacts/'),
          initialValues: {
            contact_type: 'customer',
            type: 'customer',
            name: '',
            phone: '',
            email: '',
            address: '',
            active: true,
          },
          validationSchema: Yup.object({
            name: Yup.string().required('Customer name is required'),
          }),
          fields: [
            {
              name: 'name',
              label: 'Customer Name',
              type: 'text',
              col: 24,
              required: true,
            },
            {
              name: 'phone',
              label: 'Phone',
              type: 'text',
              col: 12,
            },
            {
              name: 'email',
              label: 'Email',
              type: 'text',
              col: 12,
            },
            {
              name: 'address',
              label: 'Address',
              type: 'textarea',
              col: 24,
              rows: 2,
            },
          ],
          transformPayload: (values) => ({
            ...values,
            contact_type: values.contact_type || 'customer',
            type: values.type || 'customer',
            active: true,
          }),
        },
      },
      {
        name: 'sales_return_no',
        label: 'Credit Note No',
        type: 'text',
        col: 8,
        placeholder: 'Auto-generated',
        disabled: true,
      },
      {
        name: 'sales_return_date',
        label: 'Date',
        type: 'datePicker',
        required: true,
        col: 8,
        format: 'DD-MM-YYYY',
      },
      {
        name: 'warehouse_id',
        label: 'Warehouse',
        type: 'fkSelect',
        col: 8,
        placeholder: 'Select Warehouse',
        fkUrl: api('/api/warehouses/'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'name',
        allowClear: true,
        quickAdd: warehouseQuickAdd,
      },
      {
        name: 'currency_id',
        label: 'Currency',
        type: 'fkSelect',
        col: 8,
        placeholder: 'Currency',
        fkUrl: api('/api/currencies/'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'name',
        storeFullObject: true,
        fkLabel: (record) =>
          [record?.code, record?.symbol, record?.name].filter(Boolean).join(' - '),
      },
      {
        name: 'reference',
        label: 'Reference',
        type: 'text',
        col: 8,
        placeholder: 'Reference',
      },
      {
        name: 'invoice_id',
        label: 'From Invoice',
        type: 'fkSelect',
        col: 8,
        placeholder: 'Search invoice to auto-fill',
        fkUrl: api('/api/invoices/'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'invoice_no',
        allowClear: true,
        storeFullObject: true,
        fkLabel: (r) => [r?.invoice_no, r?.contact?.name].filter(Boolean).join(' — '),
        onSelectRecord: (record, values) => {
          if (!record) return { ...values, invoice_id: null };
          const lineSource = record?.invoiceLines ?? record?.invoice_lines ?? record?.items ?? [];
          const items = lineSource.length > 0
            ? lineSource.map((line) => {
                const baseRow = {
                  ...emptyLine,
                  product_id: line?.product ?? null,
                  product_name: line?.product?.name ?? line?.product_name ?? '',
                  description: line?.description ?? '',
                  qty: toNumber(line?.qty ?? line?.quantity ?? 1),
                  unit_price: toNumber(line?.unit_price ?? line?.rate ?? 0),
                  tax_rate_id: line?.taxRate ?? line?.tax_rate ?? null,
                };
                const calc = calculateLine(baseRow);
                return { ...baseRow, ...calc };
              })
            : values.items;
          return {
            ...values,
            invoice_id: record,
            reference: values.reference || record?.invoice_no || '',
            contact_id: record?.contact ?? values.contact_id,
            currency_id: record?.currency ?? values.currency_id,
            items,
          };
        },
      },
      {
        name: 'items',
        label: '',
        type: 'objectArray',
        col: 24,
        addButtonLabel: 'Add Product / Service',
        defaultItem: { ...emptyLine },
        headerBg: '#4b5563',
        headerColor: '#ffffff',
        rowStartExpanded: false,

        recalculateRow: (row) => {
          const calculated = calculateLine(row);

          return {
            ...row,
            discount_type: calculated.discount_type,
            discount_value: calculated.discount_value,
            discount_percent: calculated.discount_percent,
            discount_amount: calculated.discount_amount,
            tax_jurisdiction_id: calculated.tax_jurisdiction_id,
            tax_percent: calculated.tax_percent,
            tax_amount: calculated.tax_amount,
            tax_breakup: calculated.tax_breakup,
            line_total: calculated.line_total,
          };
        },

        columns: [
          {
            key: 'product_id',
            name: 'product_id',
            label: 'Product / Service',
            type: 'fkSelect',
            width: '250px',
            placeholder: 'Add Code or Product',
            fkUrl: api('/api/products/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            labelField: 'product_name',
            quickAdd: productQuickAdd,

            fkLabel: (record) => {
              const name = record?.name || '';
              const code = record?.code || record?.sku || record?.barcode || '';
              return [code, name].filter(Boolean).join(' - ');
            },

            fkOptionRender: (record) => {
              const name = record?.name || '';
              const code = record?.code || record?.sku || record?.barcode || '';
              const type =
                record?.type_of_product === 'services' ||
                record?.product_type === 'service'
                  ? 'Service'
                  : 'Product';

              return (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    width: '100%',
                  }}
                >
                  <span>{name}</span>
                  <span style={{ opacity: 0.75 }}>
                    {[code, type].filter(Boolean).join(' • ')}
                  </span>
                </div>
              );
            },

            onSelectRecord: (record, row) => {
              const unitPrice = toNumber(record?.selling_price ?? record?.sale_price ?? record?.price ?? row?.unit_price);
              const defaultTaxRate = record?.default_tax_rate ?? null;
              const baseRow = {
                ...row,
                product_id: record?.id ?? null,
                product_name: record?.name || '',
                description: row?.description || record?.description || '',
                unit_price: unitPrice,
                tax_rate_id: defaultTaxRate ?? row.tax_rate_id ?? null,
                tax_jurisdiction_id: defaultTaxRate ? getTaxJurisdictionId(defaultTaxRate) : (row.tax_jurisdiction_id ?? null),
              };
              const calc = calculateLine(baseRow);
              return { ...baseRow, tax_amount: calc.tax_amount, tax_breakup: calc.tax_breakup, line_total: calc.line_total };
            },
          },
          {
            key: 'qty',
            name: 'qty',
            label: 'Qty',
            type: 'number',
            width: '70px',
            min: 0,
          },
          {
            key: 'unit_price',
            name: 'unit_price',
            label: 'Rate',
            type: 'number',
            width: '90px',
            min: 0,
            addonBefore: ({ values }) => getCurrencySymbol(values),
            prefix: ({ values }) => getCurrencySymbol(values),
          },
          {
            key: 'discount_value',
            name: 'discount_value',
            label: 'Discount',
            type: 'custom',
            width: '170px',
            component: LineDiscountInput,
          },
          {
            key: 'tax_rate_id',
            name: 'tax_rate_id',
            label: 'Tax',
            type: 'fkSelect',
            width: '130px',
            placeholder: 'No VAT',
            fkUrl: api('/api/tax-rates/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            storeFullObject: true,
            allowClear: true,
            fkLabel: (record) =>
              [
                record?.name,
                record?.rate_percent ? `${toNumber(record.rate_percent)}%` : null,
              ]
                .filter(Boolean)
                .join(' - '),
            onSelectRecord: (record, row) => {
              const taxPercent = getTaxPercent(record);

              const calculated = calculateLine({
                ...row,
                tax_rate_id: record,
                tax_percent: taxPercent,
                tax_jurisdiction_id: getTaxJurisdictionId(record),
              });

              return {
                ...row,
                tax_rate_id: record,
                tax_jurisdiction_id: getTaxJurisdictionId(record),
                tax_percent: taxPercent,
                tax_amount: calculated.tax_amount,
                tax_breakup: calculated.tax_breakup,
                line_total: calculated.line_total,
              };
            },
          },
          {
            key: 'line_total',
            name: 'line_total',
            label: 'Amount',
            type: 'number',
            width: '130px',
            min: 0,
            disabled: true,
            addonBefore: ({ values }) => getCurrencySymbol(values),
            prefix: ({ values }) => getCurrencySymbol(values),
            formula: (row) => calculateLine(row).line_total,
          },
        ],

        collapsedFields: [
          {
            key: 'description',
            name: 'description',
            label: 'Description',
            type: 'textarea',
            col: 24,
            rows: 2,
            placeholder: 'Line description',
          },
        ],
      },
      {
        name: 'notes',
        label: 'Notes',
        type: 'textarea',
        col: 12,
        rows: 5,
        placeholder: 'Notes',
      },
      {
        name: '_credit_note_totals',
        label: '',
        type: 'custom',
        col: 12,
        render: ({ values }) => <CreditNoteTotals values={values} />,
      },
    ],
    [baseCurrency]
  );

  const validationSchema = useMemo(
    () =>
      Yup.object().shape({
        contact_id: Yup.mixed()
          .test('customer-required', 'Customer is required', (value) => !!asId(value))
          .required('Customer is required'),

        sales_return_date: Yup.mixed().required('Date is required'),

        items: Yup.array()
          .of(
            Yup.object()
              .shape({
                product_id: Yup.mixed().nullable(),
                product_name: Yup.string().nullable(),

                qty: Yup.number()
                  .typeError('Qty must be a number')
                  .moreThan(0, 'Qty must be greater than 0')
                  .required('Qty is required'),

                unit_price: Yup.number()
                  .typeError('Rate must be a number')
                  .min(0, 'Rate cannot be negative')
                  .required('Rate is required'),

                discount_type: Yup.string()
                  .oneOf(['percent', 'amount'])
                  .default('percent'),

                discount_value: Yup.number()
                  .typeError('Discount must be a number')
                  .min(0, 'Discount cannot be negative')
                  .test(
                    'discount-percent-max',
                    'Discount percent cannot be more than 100',
                    function (value) {
                      const line = this.parent;

                      if ((line?.discount_type || 'percent') !== 'percent') {
                        return true;
                      }

                      return toNumber(value) <= 100;
                    }
                  )
                  .nullable(),

                discount_percent: Yup.number().nullable(),
                discount_amount: Yup.number().nullable(),

                tax_jurisdiction_id: Yup.mixed().nullable(),
                tax_percent: Yup.number().nullable(),

                tax_amount: Yup.number()
                  .typeError('Tax amount must be a number')
                  .min(0, 'Tax amount cannot be negative')
                  .nullable(),

                tax_breakup: Yup.mixed().nullable(),

                line_total: Yup.number()
                  .typeError('Line total must be a number')
                  .min(0, 'Line total cannot be negative')
                  .nullable(),
              })
              .test(
                'product-or-custom-name',
                'Product / service is required',
                (line) =>
                  !!asId(line?.product_id) ||
                  !!cleanText(line?.product_name).trim()
              )
          )
          .min(1, 'At least one product / service is required')
          .required('At least one product / service is required'),
      }),
    []
  );

  const crudInitialValues = useMemo(
    () => ({
      sales_return_no: '',
      sales_return_date: dayjs(),

      contact_id: null,
      warehouse_id: null,

      currency_id: baseCurrency,

      invoice_id: null,
      reference: '',
      notes: '',

      items: [{ ...emptyLine }],
      deleted_item_ids: [],
    }),
    [baseCurrency]
  );

  const transformPayload = (values = {}) => {
    const rawItems = Array.isArray(values.items) ? values.items : [];

    const items = rawItems
      .map(normalizeLine)
      .filter(
        (line) =>
          !!asId(line.product_id) ||
          !!cleanText(line.product_name).trim()
      );

    const summary = calculateSummary(items);

    return {
      sales_return_no: nullIfEmpty(values.sales_return_no),

      sales_return_date: formatDate(values.sales_return_date),

      contact_id: asId(values.contact_id ?? values.contact),
      warehouse_id: asId(values.warehouse_id ?? values.warehouse),
      currency_id: asId(values.currency_id ?? values.currency),
      invoice_id: asId(values.invoice_id) || null,

      reference: nullIfEmpty(values.reference),
      notes: nullIfEmpty(values.notes),

      subtotal: summary.subTotal,
      sub_total: summary.subTotal,
      discount_total: summary.discount,
      non_taxable_total: summary.nonTaxableTotal,
      taxable_total: summary.taxableTotal,
      vat_total: summary.vat,
      tax_total: summary.vat,
      total: summary.grandTotal,
      grand_total: summary.grandTotal,

      items,

      deleted_item_ids: Array.isArray(values.deleted_item_ids)
        ? values.deleted_item_ids.filter(Boolean)
        : [],
    };
  };

  return (
    <AuthenticatedLayout auth={props.auth} user={props.auth?.user}>
      <Head title="New Credit Note" />

      <style>
        {`
          .credit-note-form-drawer .ant-drawer-content {
            background: #ffffff;
          }

          .credit-note-form-drawer .ant-drawer-header {
            min-height: 38px;
            padding: 0 14px;
            border-bottom: 1px solid #d9dee7;
            background: #ffffff;
          }

          .credit-note-form-drawer .ant-drawer-title {
            font-size: 14px;
            font-weight: 700;
            color: #1f2937;
          }

          .credit-note-form-drawer .ant-drawer-body {
            padding: 12px 14px 24px;
            background: #ffffff;
          }

          .credit-note-form-drawer .ant-form {
            max-width: 100%;
            margin: 0;
            padding: 0;
          }

          .credit-note-form-drawer .ant-form-item {
            margin-bottom: 12px;
          }

          .credit-note-form-drawer .ant-form-item-label {
            padding-bottom: 3px;
          }

          .credit-note-form-drawer .ant-form-item-label > label {
            height: auto;
            font-size: 12px;
            font-weight: 600;
            color: #1f2937;
          }

          .credit-note-form-drawer .ant-input,
          .credit-note-form-drawer .ant-input-number,
          .credit-note-form-drawer .ant-picker,
          .credit-note-form-drawer .ant-select-selector {
            min-height: 31px;
            border-radius: 0 !important;
            border-color: #cbd5e1 !important;
            background: #ffffff;
            box-shadow: none !important;
          }

          .credit-note-form-drawer .ant-input-number {
            width: 100%;
          }

          .credit-note-form-drawer textarea.ant-input {
            min-height: 76px;
            resize: vertical;
          }

          .credit-note-form-drawer .ant-input[disabled],
          .credit-note-form-drawer .ant-input-number-disabled,
          .credit-note-form-drawer .ant-select-disabled .ant-select-selector {
            color: #111827;
            background: #eef2f7 !important;
          }

          .credit-note-form-drawer .ant-form-item-explain,
          .credit-note-form-drawer .ant-form-item-extra {
            font-size: 11px;
          }

          .credit-note-form-drawer .ant-btn-primary {
            min-width: 88px;
            height: 31px;
            border-radius: 0;
            background: #16a34a;
            border-color: #16a34a;
            font-weight: 700;
          }

          .credit-note-form-drawer .ant-btn-primary:hover {
            background: #15803d !important;
            border-color: #15803d !important;
          }

          .credit-note-form-drawer .ant-btn {
            border-radius: 0;
          }

          .credit-note-form-drawer .ant-table-wrapper,
          .credit-note-form-drawer [class*="objectArray"],
          .credit-note-form-drawer [class*="ObjectArray"] {
            margin-top: 8px;
          }

          .credit-note-form-drawer .ant-table {
            border: 1px solid #cbd5e1;
            border-radius: 0;
          }

          .credit-note-form-drawer .ant-table-thead > tr > th {
            background: #4b5563 !important;
            color: #ffffff !important;
            font-size: 12px;
            font-weight: 700;
            border-bottom: 0;
          }

          .credit-note-form-drawer .ant-table-tbody > tr > td {
            padding: 7px 10px;
            vertical-align: top;
          }

          .credit-note-form-drawer .ant-table-tbody .ant-form-item {
            margin-bottom: 0;
          }

          .credit-note-total-card {
            border: 1px solid #d8dee8;
            background: #eef2f8;
          }

          .credit-note-total-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 9px 12px;
            font-size: 13px;
            color: #111827;
          }

          .credit-note-total-row strong {
            font-weight: 600;
          }

          .credit-note-total-grand {
            margin-top: 8px;
            padding-top: 14px;
            padding-bottom: 14px;
            border-top: 1px solid #d8dee8;
            font-size: 15px;
            font-weight: 700;
          }

          .credit-note-total-grand strong {
            font-size: 18px;
          }

          @media (max-width: 900px) {
            .credit-note-form-drawer .ant-drawer-body {
              padding: 12px;
            }
          }
        `}
      </style>

      <ReusableCrud
        key={baseCurrency?.id || 'credit-note-add'}
        title="Credit Notes"
        addTitle="New Credit Note"
        drawerClassName="credit-note-form-drawer"
        apiUrl={api('/api/credit-notes/')}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        ui_type="add form"
        form_ui="drawer"
        drawerWidth="100vw"
        onAddSuccess={(record) => {
          if (record?.id) {
            visitCreditNoteShow(record.id);
          }
        }}
      />
    </AuthenticatedLayout>
  );
}