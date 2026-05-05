import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (v) => toNumber(v).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (v) => { if (!v) return null; const d = dayjs(v, 'DD-MM-YYYY', true); if (d.isValid()) return d.format('YYYY-MM-DD'); const d2 = dayjs(v); return d2.isValid() ? d2.format('YYYY-MM-DD') : v; };
const statusColor = (s) => ({ sent: 'blue', accepted: 'green', rejected: 'red', cancelled: 'volcano' }[s] || 'default');

const emptyLine = { product_id: null, product_name: '', description: '', qty: 1, unit_price: 0, discount_percent: 0, tax_rate_id: null, tax_amount: 0 };

export default function Quotations(props) {
  const columns = useMemo(() => [
    { title: '#No', dataIndex: 'quotation_no', key: 'quotation_no', sorter: true, width: 130, render: (v) => <Text strong>{v || 'DRAFT'}</Text> },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v) => <Tag color={statusColor(v)}>{v || 'draft'}</Tag> },
    { title: 'Date', dataIndex: 'quotation_date', key: 'quotation_date', sorter: true, width: 120, render: (v) => v ? dayjs(v).format('DD-MM-YYYY') : '-' },
    { title: 'Expiry', dataIndex: 'expiry_date', key: 'expiry_date', width: 120, render: (v) => v ? dayjs(v).format('DD-MM-YYYY') : '-' },
    { title: 'Contact', dataIndex: 'contact', key: 'contact', render: (_, r) => r?.contact?.name || '-' },
    { title: 'Total', dataIndex: 'total', key: 'total', sorter: true, align: 'right', render: (v) => <Text strong>{money(v)}</Text> },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', ellipsis: true },
  ], []);

  const fields = useMemo(() => [
    { name: 'quotation_no', label: 'Quotation No', type: 'text', col: 8, placeholder: 'Auto-generated if blank' },
    { name: 'quotation_date', label: 'Quotation Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY' },
    { name: 'expiry_date', label: 'Expiry Date', type: 'datePicker', col: 8, format: 'DD-MM-YYYY' },
    { name: 'status', label: 'Status', type: 'select', col: 6, options: [{ value: 'draft', label: 'Draft' }, { value: 'sent', label: 'Sent' }, { value: 'accepted', label: 'Accepted' }, { value: 'rejected', label: 'Rejected' }, { value: 'cancelled', label: 'Cancelled' }] },
    { name: 'contact_id', label: 'Contact', type: 'fkSelect', required: true, col: 10, fkUrl: api('/api/crm/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'credit_term_id', label: 'Credit Term', type: 'fkSelect', col: 8, fkUrl: api('/api/crm/credit-terms/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'currency_id', label: 'Currency', type: 'fkSelect', col: 8, fkUrl: api('/api/master/currencies/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.code ? `${r.code} - ${r.name}` : r?.name || '' },
    { name: 'exchange_rate', label: 'Exchange Rate', type: 'number', col: 6, min: 0 },
    {
      name: 'items', label: 'Quotation Lines', type: 'objectArray', col: 24, headerBg: '#1a3c5e', headerColor: '#ffffff', addButtonLabel: 'Add Line',
      defaultItem: { ...emptyLine },
      columns: [
        { key: 'product_id', name: 'product_id', label: 'Product', type: 'fkSelect', width: '3fr', fkUrl: api('/api/inventory/products/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { key: 'product_name', name: 'product_name', label: 'Product Name', type: 'text', width: '2fr' },
        { key: 'description', name: 'description', label: 'Description', type: 'text', width: '2fr' },
        { key: 'qty', name: 'qty', label: 'Qty', type: 'number', width: '90px', min: 0 },
        { key: 'unit_price', name: 'unit_price', label: 'Unit Price', type: 'number', width: '130px', min: 0 },
        { key: 'discount_percent', name: 'discount_percent', label: 'Disc %', type: 'number', width: '90px', min: 0, max: 100 },
        { key: 'tax_rate_id', name: 'tax_rate_id', label: 'Tax Rate', type: 'fkSelect', width: '150px', fkUrl: api('/api/tax/tax-rates/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { key: 'tax_amount', name: 'tax_amount', label: 'Tax Amt', type: 'number', width: '110px', min: 0 },
      ],
    },
    { name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 3 },
  ], []);

  const validationSchema = Yup.object().shape({
    quotation_date: Yup.string().required('Date is required'),
    contact_id: Yup.string().nullable().required('Contact is required'),
    items: Yup.array().of(Yup.object().shape({ qty: Yup.number().min(0).required(), unit_price: Yup.number().min(0).required() })).min(1, 'At least one line required'),
  });

  const crudInitialValues = { quotation_no: '', quotation_date: dayjs().format('YYYY-MM-DD'), expiry_date: null, status: 'draft', contact_id: null, credit_term_id: null, currency_id: null, exchange_rate: 1, notes: '', items: [{ ...emptyLine }], deleted_item_ids: [] };

  const transformPayload = (values) => ({
    ...values,
    quotation_date: formatDate(values.quotation_date), expiry_date: formatDate(values.expiry_date),
    exchange_rate: toNumber(values.exchange_rate) || 1,
    items: (values.items || []).map((r) => ({ ...r, qty: toNumber(r.qty), unit_price: toNumber(r.unit_price), discount_percent: toNumber(r.discount_percent), tax_amount: toNumber(r.tax_amount) })),
    deleted_item_ids: Array.isArray(values.deleted_item_ids) ? values.deleted_item_ids : [],
  });

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Quotations" />
      <ReusableCrud
        icon={<FileTextOutlined />} title="Quotations" apiUrl={api('/api/payment-in/quotations/')}
        columns={columns} fields={fields} validationSchema={validationSchema}
        crudInitialValues={crudInitialValues} transformPayload={transformPayload}
        form_ui="drawer" drawerWidth="calc(100vw - 32px)"
        searchParam="search" pageParam="page" pageSizeParam="page_size"
        sortMode="ordering" orderingParam="ordering" enableServerPagination={true}
        showSearch={true} canAdd={true} canEdit={true} canDelete={true} hasActions={true} hasActionColumns={true}
        anchorFilters={[{ key: 'draft', label: 'Draft', params: { status: 'draft' } }, { key: 'sent', label: 'Sent', params: { status: 'sent' } }, { key: 'accepted', label: 'Accepted', params: { status: 'accepted' } }, { key: 'all', label: 'All', params: {} }]}
        defaultAnchorKey="draft" anchorSyncWithHash
      />
    </AuthenticatedLayout>
  );
}
