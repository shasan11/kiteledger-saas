import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { renderAmountWithDefaultCurrency } from '@/Pages/App/Shared/transactionDisplay';

dayjs.extend(customParseFormat);

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

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

const calculateLineTotal = (line) => {
  const qty = toNumber(line.qty);
  const rate = toNumber(line.unit_price);
  const discountPercent = toNumber(line.discount_percent);
  const taxAmount = toNumber(line.tax_amount);

  const gross = qty * rate;
  const discount = gross * (discountPercent / 100);

  return Math.max(gross - discount + taxAmount, 0);
};

const emptyLine = {
  id: undefined,
  product_id: null,
  product_name: '',
  description: '',
  qty: 1,
  unit_price: 0,
  discount_percent: 0,
  tax_rate_id: null,
  tax_amount: 0,
  line_total: 0,
};

const normalizeLine = (line = {}) => {
  const normalized = {
    ...(line.id ? { id: line.id } : {}),
    product_id: asId(line.product_id ?? line.product),
    product_name: cleanText(line.product_name),
    description: nullIfEmpty(line.description),
    qty: toNumber(line.qty) || 0,
    unit_price: toNumber(line.unit_price),
    discount_percent: toNumber(line.discount_percent),
    tax_rate_id: asId(line.tax_rate_id ?? line.taxRate ?? line.tax_rate),
    tax_amount: toNumber(line.tax_amount),
  };

  normalized.line_total = calculateLineTotal(normalized);

  return normalized;
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
        width: "250px",
        render: (_, record) => getContactName(record),
        backendFilter: { type: 'autocomplete', paramName: 'contact_id', fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkLabelKey: 'name', fkValueKey: 'id' },
      },
      {
        title: 'Date',
        dataIndex: 'quotation_date',
        key: 'quotation_date',
        sorter: true,
        width: 120,
        render: displayDate,
        backendFilter: { type: 'date_range', fromParam: 'date_from', toParam: 'date_to' },
      },
      {
        title: 'Expiry',
        dataIndex: 'expiry_date',
        key: 'expiry_date',
        width: 120,
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
        backendFilter: { type: 'select', paramName: 'status', options: [{ value: 'draft', label: 'Draft' }, { value: 'sent', label: 'Sent' }, { value: 'accepted', label: 'Accepted' }, { value: 'rejected', label: 'Rejected' }, { value: 'expired', label: 'Expired' }, { value: 'void', label: 'Void' }] },
      },
      {
        title: 'Amount',
        dataIndex: 'total',
        key: 'total',
        sorter: true,
        align: 'right',
        width: 140,
        render: (total, record) => renderAmountWithDefaultCurrency(total, record),
        backendFilter: { type: 'amount_range', minParam: 'amount_min', maxParam: 'amount_max' },
      }
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
        columns: [
          {
            key: 'product_id',
            name: 'product_id',
            label: 'Product / service',
            type: 'fkSelect',
            width: '3fr',
            placeholder: 'Add Code or Product',
            fkUrl: api('/api/products/search?transaction=sale'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'label',
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
            width: '130px',
            placeholder: 'No Vat',
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
        name: 'status',
        label: 'Status',
        type: 'select',
        col: 6,
        hidden: true,
        options: [
          { value: 'draft', label: 'Draft' },
          { value: 'sent', label: 'Sent' },
          { value: 'accepted', label: 'Accepted' },
          { value: 'rejected', label: 'Rejected' },
          { value: 'expired', label: 'Expired' },
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
                  .min(0)
                  .max(100)
                  .nullable(),
                tax_amount: Yup.number()
                  .typeError('Tax amount must be a number')
                  .min(0)
                  .nullable(),
              })
              .test(
                'product-or-name',
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
      .filter((line) => {
        return !!asId(line.product_id) || !!cleanText(line.product_name).trim();
      });

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

      items,

      deleted_item_ids: Array.isArray(values.deleted_item_ids)
        ? values.deleted_item_ids.filter(Boolean)
        : [],
    };
  };

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Quotations" />

      <ReusableCrud
        icon={<FileTextOutlined />}
        title="Quotations"
        addTitle="New Quotation"
        editTitle="Edit Quotation"
        apiUrl={api('/api/quotations/')}
        bulkActions={{ approve: true, void: true, export: true }}
        columns={columns}
        fields={fields}
        custom_add={true}
        custom_add_link={route('payment-in.quotations.add')}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth="calc(100vw - 24px)"
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        showRowActionMenu={false}
        enableServerPagination
        showSearch
        canAdd={true}
        hasActions
        canView
        activeTableRowFunction={(record) => ({
          onClick: (event) => {
            if (
              event.target.closest(
                'button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger,.ant-select,.ant-picker'
              )
            ) {
              return;
            }

            visitQuotationShow(record.id);
          },
          style: { cursor: 'pointer' },
        })}
        anchorFilters={[
          {
            key: 'all',
            label: 'All',
            params: {},
          },
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
        ]}
        defaultAnchorKey="all"
        anchorSyncWithHash
      />
    </AuthenticatedLayout>
  );
}
