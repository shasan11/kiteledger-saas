import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography, Row, Col } from 'antd';
import { ShoppingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const asId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'object') return value.id ?? value.value ?? null;
  return value;
};

const money = (value) =>
  toNumber(value).toLocaleString('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
  if (!value) return null;

  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value.format('YYYY-MM-DD') : null;
  }

  const parsed = dayjs(value, ['YYYY-MM-DD', 'DD-MM-YYYY'], true);
  if (parsed.isValid()) return parsed.format('YYYY-MM-DD');

  const fallback = dayjs(value);
  return fallback.isValid() ? fallback.format('YYYY-MM-DD') : null;
};

const displayDate = (value) => {
  const d = formatDate(value);
  return d ? dayjs(d).format('DD-MM-YYYY') : '-';
};

const statusColors = {
  draft: 'default',
  confirmed: 'blue',
  cancelled: 'red',
};

const emptyLine = {
  id: undefined,
  product_id: null,
  custom_product_name: '',
  description: '',
  qty: 1,
  unit_price: 0,
  discount_percent: 0,
  tax_rate_id: null,
  tax_amount: 0,
  line_total: 0,
};

const calculateLineTotal = (item = {}) => {
  const gross = toNumber(item.qty) * toNumber(item.unit_price);
  const discount = (gross * toNumber(item.discount_percent)) / 100;
  return Math.max(gross - discount, 0) + toNumber(item.tax_amount);
};

const calculateSummary = (items = []) => {
  let subTotal = 0;
  let discount = 0;
  let taxableTotal = 0;
  let nonTaxableTotal = 0;
  let vat = 0;

  items.forEach((item) => {
    const gross = toNumber(item.qty) * toNumber(item.unit_price);
    const discountAmount = (gross * toNumber(item.discount_percent)) / 100;
    const net = Math.max(gross - discountAmount, 0);
    const tax = toNumber(item.tax_amount);

    subTotal += gross;
    discount += discountAmount;
    vat += tax;

    if (asId(item.tax_rate_id) || tax > 0) {
      taxableTotal += net;
    } else {
      nonTaxableTotal += net;
    }
  });

  return {
    subTotal,
    discount,
    nonTaxableTotal,
    taxableTotal,
    vat,
    grandTotal: subTotal - discount + vat,
  };
};

const normalizeLine = (item = {}) => {
  const normalized = {
    ...(item.id ? { id: item.id } : {}),
    product_id: asId(item.product_id ?? item.product),
    custom_product_name: item.custom_product_name || '',
    description: item.description || '',
    qty: toNumber(item.qty),
    unit_price: toNumber(item.unit_price),
    discount_percent: toNumber(item.discount_percent),
    tax_rate_id: asId(item.tax_rate_id ?? item.taxRate ?? item.tax_rate),
    tax_amount: toNumber(item.tax_amount),
  };

  normalized.line_total = Number(calculateLineTotal(normalized).toFixed(2));

  return normalized;
};

const PurchaseTotals = ({ values = {} }) => {
  const summary = calculateSummary(values.items || []);

  return (
    <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
      <Col xs={24} lg={12}>
        <div />
      </Col>

      <Col xs={24} lg={12}>
        <div className="po-total-card">
          <div className="po-total-row">
            <span>Sub Total</span>
            <strong>{money(summary.subTotal)}</strong>
          </div>

          <div className="po-total-row">
            <span>Discount</span>
            <strong>{summary.discount > 0 ? money(summary.discount) : '-'}</strong>
          </div>

          <div className="po-total-row">
            <span>Non-Taxable Total</span>
            <strong>{summary.nonTaxableTotal > 0 ? money(summary.nonTaxableTotal) : '-'}</strong>
          </div>

          <div className="po-total-row">
            <span>Taxable Total</span>
            <strong>{summary.taxableTotal > 0 ? money(summary.taxableTotal) : '-'}</strong>
          </div>

          <div className="po-total-row">
            <span>VAT</span>
            <strong>{summary.vat > 0 ? money(summary.vat) : '-'}</strong>
          </div>

          <div className="po-total-row po-total-grand">
            <span>Grand Total</span>
            <strong>{money(summary.grandTotal)}</strong>
          </div>
        </div>
      </Col>
    </Row>
  );
};

const visitPurchaseOrderShow = (id) => {
  if (!id) return;

  if (typeof route === 'function') {
    router.visit(route('payment-out.purchase-orders.show', id));
    return;
  }

  router.visit(`/payment-out/purchase-orders/${id}`);
};

export default function PurchaseOrders({ auth }) {
  const columns = useMemo(
    () => [
      {
        title: 'Order No',
        dataIndex: 'purchase_order_no',
        key: 'purchase_order_no',
        sorter: true,
        width: 150,
        render: (value) => <Text strong>{value || 'DRAFT'}</Text>,
      },
      {
        title: 'Supplier',
        dataIndex: ['contact', 'name'],
        key: 'contact_name',
        render: (value, record) =>
          value || record?.contact_name || record?.contact_id_detail?.label || '-',
      },
      {
        title: 'Date',
        dataIndex: 'purchase_order_date',
        key: 'purchase_order_date',
        sorter: true,
        width: 130,
        render: displayDate,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 130,
        render: (value) => (
          <Tag color={statusColors[value] || 'default'} style={{ textTransform: 'capitalize' }}>
            {value || 'draft'}
          </Tag>
        ),
      },
      {
        title: 'Exchange Rate',
        dataIndex: 'exchange_rate',
        key: 'exchange_rate',
        width: 140,
        render: (value) => money(value),
      },
      {
        title: 'Total',
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
        label: 'Supplier Name',
        type: 'fkSelect',
        required: true,
        col: 16,
        placeholder: 'Select Supplier',
        fkUrl: api('/api/contacts/'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'name',
      },
      {
        name: 'reference_no',
        label: 'Reference No',
        type: 'text',
        col: 8,
        placeholder: 'Reference Number',
      },

      {
        name: 'purchase_order_no',
        label: 'Order Number',
        type: 'text',
        col: 8,
        placeholder: 'DRAFT',
        disabled: true,
      },
      {
        name: 'purchase_order_date',
        label: 'Date',
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
        name: 'status',
        label: 'Status',
        type: 'select',
        col: 8,
        hidden: true,
        options: [
          { value: 'draft', label: 'Draft' },
          { value: 'confirmed', label: 'Confirmed' },
          { value: 'cancelled', label: 'Cancelled' },
        ],
      },
      {
        name: 'approved',
        label: 'Approved',
        type: 'switch',
        col: 6,
        hidden: true,
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
        columns: [
          {
            key: 'product_id',
            name: 'product_id',
            label: 'Product / service',
            type: 'fkSelect',
            width: 'minmax(340px, 3fr)',
            placeholder: 'Add Code or Product',
            fkUrl: api('/api/products/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
          },
          {
            key: 'custom_product_name',
            name: 'custom_product_name',
            label: 'Name',
            type: 'text',
            width: '180px',
            placeholder: 'Custom name',
          },
          {
            key: 'description',
            name: 'description',
            label: 'Description',
            type: 'text',
            width: '220px',
            placeholder: 'Description',
          },
          {
            key: 'qty',
            name: 'qty',
            label: 'Qty',
            type: 'number',
            width: '90px',
            min: 0,
          },
          {
            key: 'unit_price',
            name: 'unit_price',
            label: 'Rate',
            type: 'number',
            width: '120px',
            min: 0,
          },
          {
            key: 'discount_percent',
            name: 'discount_percent',
            label: 'Discount',
            type: 'number',
            width: '110px',
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
          },
          {
            key: 'tax_amount',
            name: 'tax_amount',
            label: 'Tax Amt',
            type: 'number',
            width: '110px',
            min: 0,
          },
          {
            key: 'line_total',
            name: 'line_total',
            label: 'Amount',
            type: 'number',
            width: '130px',
            min: 0,
            disabled: true,
            formula: (row) => Number(calculateLineTotal(row).toFixed(2)),
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
        name: '_purchase_totals',
        label: '',
        type: 'custom',
        col: 24,
        render: ({ values }) => <PurchaseTotals values={values} />,
      },
    ],
    []
  );

  const validationSchema = useMemo(
    () =>
      Yup.object().shape({
        contact_id: Yup.mixed()
          .test('supplier-required', 'Supplier is required', (value) => !!asId(value))
          .required('Supplier is required'),

        purchase_order_date: Yup.mixed().required('Date is required'),

        exchange_rate: Yup.number()
          .typeError('Exchange rate is required')
          .moreThan(0, 'Exchange rate must be greater than 0')
          .required('Exchange rate is required'),

        items: Yup.array()
          .of(
            Yup.object()
              .shape({
                product_id: Yup.mixed().nullable(),
                custom_product_name: Yup.string().nullable(),

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
                  .min(0)
                  .max(100)
                  .nullable(),

                tax_amount: Yup.number()
                  .typeError('Tax amount must be a number')
                  .min(0)
                  .nullable(),
              })
              .test(
                'product-or-custom-name',
                'Product / service is required',
                (line) =>
                  !!asId(line?.product_id) ||
                  !!String(line?.custom_product_name || '').trim()
              )
          )
          .min(1, 'At least one product / service is required')
          .required('At least one product / service is required'),
      }),
    []
  );

  const crudInitialValues = useMemo(
    () => ({
      purchase_order_no: 'DRAFT',
      reference_no: '',
      purchase_order_date: dayjs(),
      status: 'draft',
      approved: false,
      contact_id: null,
      currency_id: null,
      credit_term_id: null,
      exchange_rate: 1,
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
        (item) =>
          !!asId(item.product_id) ||
          !!String(item.custom_product_name || '').trim()
      );

    return {
      purchase_order_no:
        values.purchase_order_no && values.purchase_order_no !== 'DRAFT'
          ? values.purchase_order_no
          : null,

      reference_no: values.reference_no?.trim() || null,
      purchase_order_date: formatDate(values.purchase_order_date),

      status: values.status || 'draft',
      approved: !!values.approved,

      contact_id: asId(values.contact_id ?? values.contact),
      currency_id: asId(values.currency_id ?? values.currency),
      credit_term_id: asId(
        values.credit_term_id ?? values.creditTerm ?? values.credit_term
      ),

      exchange_rate: toNumber(values.exchange_rate) || 1,
      notes: values.notes?.trim() || null,

      items,

      deleted_item_ids: Array.isArray(values.deleted_item_ids)
        ? values.deleted_item_ids.filter(Boolean)
        : [],
    };
  };

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Purchase Orders" />

      <style>
        {`
          .purchase-order-crud .ant-drawer-content {
            background: #f8fafc;
          }

          .purchase-order-crud .ant-drawer-header {
            min-height: 38px;
            padding: 0 14px;
            border-bottom: 1px solid #d9dee7;
            background: #ffffff;
          }

          .purchase-order-crud .ant-drawer-title {
            font-size: 14px;
            font-weight: 700;
            color: #1f2937;
          }

          .purchase-order-crud .ant-drawer-body {
            padding: 12px 14px 24px;
            background: #ffffff;
          }

          .purchase-order-crud .ant-form-item {
            margin-bottom: 12px;
          }

          .purchase-order-crud .ant-form-item-label {
            padding-bottom: 3px;
          }

          .purchase-order-crud .ant-form-item-label > label {
            height: auto;
            font-size: 12px;
            font-weight: 600;
            color: #1f2937;
          }

          .purchase-order-crud .ant-input,
          .purchase-order-crud .ant-input-number,
          .purchase-order-crud .ant-picker,
          .purchase-order-crud .ant-select-selector {
            min-height: 31px;
            border-radius: 0 !important;
            border-color: #cbd5e1 !important;
            box-shadow: none !important;
          }

          .purchase-order-crud .ant-input-number {
            width: 100%;
          }

          .purchase-order-crud textarea.ant-input {
            min-height: 76px;
          }

          .purchase-order-crud .ant-input[disabled],
          .purchase-order-crud .ant-input-number-disabled,
          .purchase-order-crud .ant-select-disabled .ant-select-selector {
            color: #111827;
            background: #eef2f7 !important;
          }

          .purchase-order-crud .ant-btn-primary {
            min-width: 88px;
            height: 31px;
            border-radius: 0;
            background: #16a34a;
            border-color: #16a34a;
            font-weight: 700;
          }

          .purchase-order-crud .ant-btn-primary:hover {
            background: #15803d !important;
            border-color: #15803d !important;
          }

          .purchase-order-crud .ant-table-thead > tr > th {
            background: #4b5563 !important;
            color: #ffffff !important;
            font-size: 12px;
            font-weight: 700;
          }

          .purchase-order-crud .ant-table-tbody > tr > td {
            padding: 7px 10px;
          }

          .po-total-card {
            border: 1px solid #d8dee8;
            background: #eef2f8;
          }

          .po-total-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 9px 12px;
            font-size: 13px;
            color: #111827;
          }

          .po-total-row strong {
            font-weight: 600;
          }

          .po-total-grand {
            margin-top: 8px;
            padding-top: 14px;
            padding-bottom: 14px;
            border-top: 1px solid #d8dee8;
            font-size: 15px;
            font-weight: 700;
          }

          .po-total-grand strong {
            font-size: 18px;
          }
        `}
      </style>

      <ReusableCrud
        className="purchase-order-crud"
        drawerClassName="purchase-order-crud"
        title="Purchase Orders"
        addTitle="Add New Purchase Order"
        editTitle="Edit Purchase Order"
        icon={<ShoppingOutlined />}
        apiUrl={api('/api/purchase-orders/')}
        bulkActions={{ approve: true, void: true, export: true }}
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
        showViewColumn
        hasActions
        hasActionColumns
        viewPathBuilder={(record) =>
          typeof route === 'function'
            ? route('payment-out.purchase-orders.show', record.id)
            : `/payment-out/purchase-orders/${record.id}`
        }
        onAddSuccess={(record) => {
          if (record?.id) visitPurchaseOrderShow(record.id);
        }}
        onEditSuccess={(record) => {
          if (record?.id) visitPurchaseOrderShow(record.id);
        }}
        activeTableRowFunction={(record) => ({
          onClick: (event) => {
            if (
              event.target.closest(
                'button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger,.ant-select,.ant-picker,.ant-btn'
              )
            ) {
              return;
            }

            visitPurchaseOrderShow(record.id);
          },
          style: { cursor: 'pointer' },
        })}
        anchorFilters={[
          {
            key: 'approved',
            label: 'Approved',
            params: { approved: true },
          },
          {
            key: 'draft',
            label: 'Draft',
            params: { approved: false },
          },
          {
            key: 'all',
            label: 'All',
            params: {},
          },
        ]}
        defaultAnchorKey="approved"
        anchorSyncWithHash
      />
    </AuthenticatedLayout>
  );
}