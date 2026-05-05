import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (v) => toNumber(v).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (v) => { if (!v) return null; const d = dayjs(v, 'DD-MM-YYYY', true); if (d.isValid()) return d.format('YYYY-MM-DD'); const d2 = dayjs(v); return d2.isValid() ? d2.format('YYYY-MM-DD') : v; };

const statusColors = { draft: 'default', posted: 'green', cancelled: 'red' };

export default function CustomerPayments({ auth }) {
  const columns = useMemo(() => [
    { title: 'Payment No', dataIndex: 'payment_no', key: 'payment_no' },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (v) => <Tag color={statusColors[v] || 'default'}>{v ? v.charAt(0).toUpperCase() + v.slice(1) : '-'}</Tag>,
    },
    { title: 'Date', dataIndex: 'payment_date', key: 'payment_date' },
    { title: 'Contact', dataIndex: ['contact', 'name'], key: 'contact_name', render: (v) => v || '-' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (v) => money(v), align: 'right' },
    { title: 'Method', dataIndex: 'payment_method', key: 'payment_method' },
  ], []);

  const fields = useMemo(() => [
    { name: 'payment_no', label: 'Payment No', type: 'text', col: 8 },
    { name: 'payment_date', label: 'Payment Date', type: 'datePicker', col: 8, required: true },
    {
      name: 'status', label: 'Status', type: 'select', col: 8,
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'posted', label: 'Posted' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    { name: 'contact_id', label: 'Contact', type: 'fkSelect', col: 10, required: true, fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'account_id', label: 'Account', type: 'fkSelect', col: 10, required: true, fkUrl: api('/api/accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'currency_id', label: 'Currency', type: 'fkSelect', col: 6, fkUrl: api('/api/currencies/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'payment_method', label: 'Payment Method', type: 'text', col: 8 },
    { name: 'reference', label: 'Reference', type: 'text', col: 8 },
    { name: 'amount', label: 'Amount', type: 'number', col: 8, required: true, min: 0 },
    { name: 'exchange_rate', label: 'Exchange Rate', type: 'number', col: 6, min: 0 },
    { name: 'bank_charges', label: 'Bank Charges', type: 'number', col: 8, min: 0 },
    { name: 'bank_charges_account_id', label: 'Bank Charges Account', type: 'fkSelect', col: 8, fkUrl: api('/api/accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'tds_type', label: 'TDS Type', type: 'text', col: 8 },
    { name: 'tds_charges', label: 'TDS Charges', type: 'number', col: 8, min: 0 },
    { name: 'tds_charges_account_id', label: 'TDS Charges Account', type: 'fkSelect', col: 8, fkUrl: api('/api/accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    {
      name: 'items', label: 'Invoice Allocations', type: 'objectArray', col: 24,
      headerBg: '#1a3c5e', headerColor: '#ffffff', addButtonLabel: 'Add Invoice',
      defaultItem: { invoice_id: null, allocated_amount: 0 },
      columns: [
        { key: 'invoice_id', name: 'invoice_id', label: 'Invoice', type: 'fkSelect', width: '3fr', fkUrl: api('/api/invoices/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { key: 'allocated_amount', name: 'allocated_amount', label: 'Allocated Amount', type: 'number', width: '150px', min: 0, required: true },
      ],
    },
    { name: 'notes', label: 'Notes', type: 'textarea', col: 24 },
  ], []);

  const validationSchema = Yup.object({
    payment_date: Yup.string().required('Payment date is required'),
    contact_id: Yup.mixed().required('Contact is required'),
    account_id: Yup.mixed().required('Account is required'),
    amount: Yup.number().required('Amount is required').min(0),
  });

  const crudInitialValues = {
    payment_no: '',
    payment_date: dayjs().format('YYYY-MM-DD'),
    status: 'draft',
    contact_id: null,
    account_id: null,
    currency_id: null,
    payment_method: '',
    reference: '',
    amount: 0,
    exchange_rate: 1,
    bank_charges: 0,
    bank_charges_account_id: null,
    tds_type: '',
    tds_charges: 0,
    tds_charges_account_id: null,
    notes: '',
    items: [{ invoice_id: null, allocated_amount: 0 }],
    deleted_item_ids: [],
  };

  const transformPayload = (values) => ({
    ...values,
    payment_date: formatDate(values.payment_date),
    amount: toNumber(values.amount),
    exchange_rate: toNumber(values.exchange_rate),
    bank_charges: toNumber(values.bank_charges),
    tds_charges: toNumber(values.tds_charges),
    items: (values.items || []).map((item) => ({
      ...item,
      allocated_amount: toNumber(item.allocated_amount),
    })),
    deleted_item_ids: values.deleted_item_ids || [],
  });

  const anchorFilters = [
    { label: 'Draft', value: 'draft' },
    { label: 'Posted', value: 'posted' },
    { label: 'All', value: 'all' },
  ];

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Customer Payments" />
      <ReusableCrud
        title="Customer Payments"
        icon={<DollarOutlined />}
        apiUrl={api('/api/customer-payments/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        anchorFilters={anchorFilters}
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        enableServerPagination={true}
        showSearch={true}
        canAdd={true}
        canEdit={true}
        canDelete={true}
        hasActions={true}
        hasActionColumns={true}
      />
    </AuthenticatedLayout>
  );
}
