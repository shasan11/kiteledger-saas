import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { Col, Row, Tag, Typography } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const { Text } = Typography;

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

const asId = (value) => {
  if (value === undefined || value === null || value === '') return null;

  if (typeof value === 'object') {
    return value.id ?? value.value ?? null;
  }

  return value;
};

const getTaxPercent = (value) => {
  if (!value) return 0;

  if (typeof value === 'object') {
    return toNumber(
      value.rate ??
        value.percent ??
        value.percentage ??
        value.tax_rate ??
        value.vat_rate ??
        value.tax_percent ??
        value.taxPercent
    );
  }

  return 0;
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

const displayDate = (value) => {
  const d = formatDate(value);
  return d ? dayjs(d).format('DD-MM-YYYY') : '-';
};

const statusColor = (status) =>
  ({
    draft: 'default',
    sent: 'blue',
    accepted: 'green',
    rejected: 'red',
    expired: 'orange',
    cancelled: 'volcano',
  }[status] || 'default');

const emptyLine = {
  id: undefined,
  product_id: null,
  product_name: '',
  description: '',
  qty: 1,
  unit_price: 0,
  discount_percent: 0,
  tax_rate_id: null,
  tax_percent: 0,
  tax_amount: 0,
  line_total: 0,
};

const calculateLine = (line = {}) => {
  const qty = toNumber(line.qty);
  const rate = toNumber(line.unit_price);
  const discountPercent = toNumber(line.discount_percent);

  const taxPercent =
    toNumber(line.tax_percent) ||
    getTaxPercent(line.tax_rate_id) ||
    getTaxPercent(line.taxRate) ||
    getTaxPercent(line.tax_rate);

  const gross = qty * rate;
  const discountAmount = gross * (discountPercent / 100);
  const taxableAmount = Math.max(gross - discountAmount, 0);
  const taxAmount = taxableAmount * (taxPercent / 100);
  const lineTotal = taxableAmount + taxAmount;

  return {
    gross: roundMoney(gross),
    discount_amount: roundMoney(discountAmount),
    taxable_amount: roundMoney(taxableAmount),
    tax_percent: roundMoney(taxPercent),
    tax_amount: roundMoney(taxAmount),
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
    discount_percent: toNumber(line.discount_percent),

    tax_rate_id: asId(line.tax_rate_id ?? line.taxRate ?? line.tax_rate),
    tax_percent: calculated.tax_percent,
    tax_amount: calculated.tax_amount,
    line_total: calculated.line_total,
  };
};

const QuotationTotals = ({ values = {} }) => {
  const summary = calculateSummary(values.items || []);

  return (
    <Row gutter={[16, 16]} style={{ marginTop: 0 }}>
      <Col xs={24} lg={12}>
        <div />
      </Col>

      <Col xs={24} lg={12}>
        <div className="quotation-total-card">
          <div className="quotation-total-row">
            <span>Sub Total</span>
            <strong>{money(summary.subTotal)}</strong>
          </div>

          <div className="quotation-total-row">
            <span>Discount</span>
            <strong>{summary.discount > 0 ? money(summary.discount) : '-'}</strong>
          </div>

          <div className="quotation-total-row">
            <span>Non-Taxable Total</span>
            <strong>{summary.nonTaxableTotal > 0 ? money(summary.nonTaxableTotal) : '-'}</strong>
          </div>

          <div className="quotation-total-row">
            <span>Taxable Total</span>
            <strong>{summary.taxableTotal > 0 ? money(summary.taxableTotal) : '-'}</strong>
          </div>

          <div className="quotation-total-row">
            <span>VAT</span>
            <strong>{summary.vat > 0 ? money(summary.vat) : '-'}</strong>
          </div>

          <div className="quotation-total-row quotation-total-grand">
            <span>Grand Total</span>
            <strong>{money(summary.grandTotal)}</strong>
          </div>
        </div>
      </Col>
    </Row>
  );
};

const getContactName = (record) =>
  record?.contact?.name ||
  record?.contact_name ||
  record?.contact_id_detail?.label ||
  '-';

const visitQuotationShow = (id) => {
  if (!id) return;

  if (typeof route === 'function') {
    router.visit(route('payment-in.quotations.show', id));
    return;
  }

  router.visit(`/payment-in/quotations/${id}`);
};

export default function Quotations(props) {
  const columns = useMemo(
    () => [
      {
        title: 'Code',
        dataIndex: 'quotation_no',
        key: 'quotation_no',
        sorter: true,
        width: 140,
        render: (value) => <Text strong>{value || 'DRAFT'}</Text>,
      },
      {
        title: 'Customer',
        dataIndex: 'contact',
        key: 'contact',
        sorter: true,
        render: (_, record) => getContactName(record),
      },
      {
        title: 'Date',
        dataIndex: 'quotation_date',
        key: 'quotation_date',
        sorter: true,
        width: 130,
        render: displayDate,
      },
      {
        title: 'Expiry',
        dataIndex: 'expiry_date',
        key: 'expiry_date',
        sorter: true,
        width: 130,
        render: displayDate,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (value) => (
          <Tag color={statusColor(value)} style={{ textTransform: 'capitalize' }}>
            {value || 'draft'}
          </Tag>
        ),
      },
      {
        title: 'Amount',
        dataIndex: 'total',
        key: 'total',
        sorter: true,
        align: 'right',
        width: 150,
        render: (value) => <Text strong>{money(value)}</Text>,
      },
    ],
    []
  );

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
      },
      {
        name: 'quotation_no',
        label: 'Code',
        type: 'text',
        col: 8,
        placeholder: 'DRAFT',
        disabled: true,
      },
      {
        name: 'quotation_date',
        label: 'Date',
        type: 'datePicker',
        required: true,
        col: 8,
        format: 'DD-MM-YYYY',
      },
      {
        name: 'expiry_date',
        label: 'Expiry Date',
        type: 'datePicker',
        required: true,
        col: 8,
        format: 'DD-MM-YYYY',
      },
      {
        name: 'credit_term_id',
        label: 'Credit Terms',
        type: 'fkSelect',
        col: 8,
        placeholder: 'Credit Terms',
        fkUrl: api('/api/credit-terms/'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'name',
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
        fkLabel: (record) => record?.name || record?.code || '',
      },
      {
        name: 'exchange_rate',
        label: 'Exchange Rate To NPR',
        type: 'number',
        required: true,
        col: 8,
        min: 0,
      },
      {
        name: 'items',
        label: '',
        type: 'objectArray',
        col: 24,
        addButtonLabel: 'Add Code or Product',
        defaultItem: { ...emptyLine },
        headerBg: '#4b5563',
        headerColor: '#ffffff',

        recalculateRow: (row) => {
          const calculated = calculateLine(row);

          return {
            ...row,
            tax_percent: calculated.tax_percent,
            tax_amount: calculated.tax_amount,
            line_total: calculated.line_total,
          };
        },

        columns: [
          {
            key: 'product_id',
            name: 'product_id',
            label: 'Product / service',
            type: 'fkSelect',
            width: '200px',
            placeholder: 'Add Code or Product',
            fkUrl: api('/api/products/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
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
            width: '70px',
            min: 0,
          },
          {
            key: 'discount_percent',
            name: 'discount_percent',
            label: 'Discount %',
            type: 'number',
            width: '90px',
            min: 0,
            max: 100,
          },
          {
            key: 'tax_rate_id',
            name: 'tax_rate_id',
            label: 'Tax',
            type: 'fkSelect',
            width: '140px',
            placeholder: 'No VAT',
            fkUrl: api('/api/tax-rates/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            storeFullObject: true,
            onSelectRecord: (record, row) => {
              const taxPercent = getTaxPercent(record);

              return {
                ...row,
                tax_rate_id: record,
                tax_percent: taxPercent,
              };
            },
          },
          {
            key: 'tax_amount',
            name: 'tax_amount',
            label: 'VAT',
            type: 'number',
            width: '100px',
            min: 0,
            disabled: true,
            formula: (row) => calculateLine(row).tax_amount,
          },
          {
            key: 'line_total',
            name: 'line_total',
            label: 'Amount',
            type: 'number',
            width: '130px',
            min: 0,
            disabled: true,
            formula: (row) => calculateLine(row).line_total,
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
        help: 'This will appear on print',
      },
      {
        name: '_quotation_totals',
        label: '',
        type: 'custom',
        col: 24,
        render: ({ values }) => <QuotationTotals values={values} />,
      },
    ],
    []
  );

  const validationSchema = useMemo(
    () =>
      Yup.object().shape({
        contact_id: Yup.mixed()
          .test('customer-required', 'Customer is required', (value) => !!asId(value))
          .required('Customer is required'),

        quotation_date: Yup.mixed().required('Date is required'),

        expiry_date: Yup.mixed().required('Expiry date is required'),

        currency_id: Yup.mixed().nullable(),

        exchange_rate: Yup.number()
          .typeError('Exchange rate is required')
          .moreThan(0, 'Exchange rate must be greater than 0')
          .required('Exchange rate is required'),

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

                discount_percent: Yup.number()
                  .typeError('Discount must be a number')
                  .min(0, 'Discount cannot be negative')
                  .max(100, 'Discount cannot be more than 100')
                  .nullable(),

                tax_percent: Yup.number().nullable(),

                tax_amount: Yup.number()
                  .typeError('Tax amount must be a number')
                  .min(0, 'Tax amount cannot be negative')
                  .nullable(),

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
      quotation_no: 'DRAFT',
      quotation_date: dayjs(),
      expiry_date: dayjs().add(6, 'day'),

      contact_id: null,
      credit_term_id: null,
      currency_id: null,
      exchange_rate: 1,

      status: 'draft',
      approved: false,

      notes: '',
      items: [{ ...emptyLine }],
      deleted_item_ids: [],
    }),
    []
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
      quotation_no:
        values.quotation_no && values.quotation_no !== 'DRAFT'
          ? values.quotation_no
          : null,

      quotation_date: formatDate(values.quotation_date),
      expiry_date: formatDate(values.expiry_date),

      contact_id: asId(values.contact_id ?? values.contact),
      credit_term_id: asId(
        values.credit_term_id ?? values.creditTerm ?? values.credit_term
      ),
      currency_id: asId(values.currency_id ?? values.currency),

      exchange_rate: toNumber(values.exchange_rate) || 1,

      status: values.status || 'draft',
      approved: !!values.approved,

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
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Quotations" />

      <style>
        {`
          .quotation-form-drawer .ant-drawer-content {
            background: #ffffff;
          }

          .quotation-form-drawer .ant-drawer-header {
            min-height: 38px;
            padding: 0 14px;
            border-bottom: 1px solid #d9dee7;
            background: #ffffff;
          }

          .quotation-form-drawer .ant-drawer-title {
            font-size: 14px;
            font-weight: 700;
            color: #1f2937;
          }

          .quotation-form-drawer .ant-drawer-body {
            padding: 12px 14px 24px;
            background: #ffffff;
          }

          .quotation-form-drawer .ant-form {
            max-width: 100%;
            margin: 0;
            padding: 0;
          }

          .quotation-form-drawer .ant-form-item {
            margin-bottom: 12px;
          }

          .quotation-form-drawer .ant-form-item-label {
            padding-bottom: 3px;
          }

          .quotation-form-drawer .ant-form-item-label > label {
            height: auto;
            font-size: 12px;
            font-weight: 600;
            color: #1f2937;
          }

          .quotation-form-drawer .ant-input,
          .quotation-form-drawer .ant-input-number,
          .quotation-form-drawer .ant-picker,
          .quotation-form-drawer .ant-select-selector {
            min-height: 31px;
            border-radius: 0 !important;
            border-color: #cbd5e1 !important;
            background: #ffffff;
            box-shadow: none !important;
          }

          .quotation-form-drawer .ant-input-number {
            width: 100%;
          }

          .quotation-form-drawer textarea.ant-input {
            min-height: 76px;
            resize: vertical;
          }

          .quotation-form-drawer .ant-input[disabled],
          .quotation-form-drawer .ant-input-number-disabled,
          .quotation-form-drawer .ant-select-disabled .ant-select-selector {
            color: #111827;
            background: #eef2f7 !important;
          }

          .quotation-form-drawer .ant-form-item-explain,
          .quotation-form-drawer .ant-form-item-extra {
            font-size: 11px;
          }

          .quotation-form-drawer .ant-btn-primary {
            min-width: 88px;
            height: 31px;
            border-radius: 0;
            background: #16a34a;
            border-color: #16a34a;
            font-weight: 700;
          }

          .quotation-form-drawer .ant-btn-primary:hover {
            background: #15803d !important;
            border-color: #15803d !important;
          }

          .quotation-form-drawer .ant-btn {
            border-radius: 0;
          }

          .quotation-form-drawer .ant-table-wrapper,
          .quotation-form-drawer [class*="objectArray"],
          .quotation-form-drawer [class*="ObjectArray"] {
            margin-top: 8px;
          }

          .quotation-form-drawer .ant-table {
            border: 1px solid #cbd5e1;
            border-radius: 0;
          }

          .quotation-form-drawer .ant-table-thead > tr > th {
            background: #4b5563 !important;
            color: #ffffff !important;
            font-size: 12px;
            font-weight: 700;
            border-bottom: 0;
          }

          .quotation-form-drawer .ant-table-tbody > tr > td {
            padding: 7px 10px;
            vertical-align: top;
          }

          .quotation-form-drawer .ant-table-tbody .ant-form-item {
            margin-bottom: 0;
          }

          .quotation-total-card {
            border: 1px solid #d8dee8;
            background: #eef2f8;
          }

          .quotation-total-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 9px 12px;
            font-size: 13px;
            color: #111827;
          }

          .quotation-total-row strong {
            font-weight: 600;
          }

          .quotation-total-grand {
            margin-top: 8px;
            padding-top: 14px;
            padding-bottom: 14px;
            border-top: 1px solid #d8dee8;
            font-size: 15px;
            font-weight: 700;
          }

          .quotation-total-grand strong {
            font-size: 18px;
          }

          @media (max-width: 900px) {
            .quotation-form-drawer .ant-drawer-body {
              padding: 12px;
            }
          }
        `}
      </style>

      <ReusableCrud
        className="quotation-crud"
        drawerClassName="quotation-form-drawer"
        icon={<FileTextOutlined />}
        title="Quotations"
        addTitle="New Quotation"
        editTitle="Edit Quotation"
        apiUrl={api('/api/quotations/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        ui_type="add form"
        drawerWidth="100vw"
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        enableServerPagination
        showSearch
        canAdd
        canEdit
        canDelete
        hasActions
        hasActionColumns
        onAddSuccess={(record) => {
          if (record?.id) {
            visitQuotationShow(record.id);
          }
        }}
        onEditSuccess={(record) => {
          if (record?.id) {
            visitQuotationShow(record.id);
          }
        }}
        activeTableRowFunction={(record) => ({
          onClick: (event) => {
            const ignored = event.target.closest(
              [
                'button',
                'a',
                'input',
                'textarea',
                '.ant-checkbox-wrapper',
                '.ant-dropdown-trigger',
                '.ant-select',
                '.ant-picker',
                '.ant-btn',
                '.ant-dropdown',
              ].join(',')
            );

            if (ignored) return;

            visitQuotationShow(record.id);
          },
          style: { cursor: 'pointer' },
        })}
        anchorFilters={[
          {
            key: 'draft',
            label: 'Draft',
            params: { approved: false },
          },
          {
            key: 'approved',
            label: 'Approved',
            params: { approved: true },
          },
          {
            key: 'all',
            label: 'All',
            params: {},
          },
        ]}
        defaultAnchorKey="draft"
        anchorSyncWithHash
      />
    </AuthenticatedLayout>
  );
}