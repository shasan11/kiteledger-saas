import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
import { FileProtectOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (v) => toNumber(v).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (value) => {
  if (!value) return null;
  const d = dayjs(value, 'DD-MM-YYYY', true);
  if (d.isValid()) return d.format('YYYY-MM-DD');
  const d2 = dayjs(value);
  return d2.isValid() ? d2.format('YYYY-MM-DD') : value;
};
const statusColor = (s) => {
  if (s === 'posted' || s === 'paid') return 'green';
  if (s === 'void' || s === 'cancelled') return 'red';
  if (s === 'partial') return 'orange';
  return 'default';
};

const emptyLine = { product_id: null, custom_product_name: '', description: '', qty: 1, unit_price: 0, discount_percent: 0, tax_rate_id: null, tax_amount: 0 };

export default function Invoices(props) {
  const columns = useMemo(() => [
    { title: '#No', dataIndex: 'invoice_no', key: 'invoice_no', sorter: true, width: 130, render: (v) => <Text strong>{v || 'DRAFT'}</Text> },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v) => <Tag color={statusColor(v)}>{v || 'draft'}</Tag> },
    { title: 'Invoice Date', dataIndex: 'invoice_date', key: 'invoice_date', sorter: true, width: 120, render: (v) => v ? dayjs(v).format('DD-MM-YYYY') : '-' },
    { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', width: 120, render: (v) => v ? dayjs(v).format('DD-MM-YYYY') : '-' },
    { title: 'Contact', dataIndex: 'contact', key: 'contact', render: (_, r) => r?.contact?.name || '-' },
    { title: 'Total', dataIndex: 'total', key: 'total', sorter: true, align: 'right', render: (v) => <Text strong>{money(v)}</Text> },
  ], []);

  const fields = useMemo(() => [
    { name: 'invoice_no', label: 'Invoice No', type: 'text', col: 8, placeholder: 'Auto-generated if blank' },
    { name: 'invoice_date', label: 'Invoice Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY' },
    { name: 'due_date', label: 'Due Date', type: 'datePicker', col: 8, format: 'DD-MM-YYYY' },
    { name: 'status', label: 'Status', type: 'select', col: 6, options: [{ value: 'draft', label: 'Draft' }, { value: 'posted', label: 'Posted' }, { value: 'partial', label: 'Partial' }, { value: 'paid', label: 'Paid' }, { value: 'void', label: 'Void' }] },
    { name: 'contact_id', label: 'Contact', type: 'fkSelect', required: true, col: 10, fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'currency_id', label: 'Currency', type: 'fkSelect', col: 8, fkUrl: api('/api/currencies/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.code ? `${r.code} - ${r.name}` : r?.name || '' },
    { name: 'warehouse_id', label: 'Warehouse', type: 'fkSelect', col: 8, fkUrl: api('/api/warehouses/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'reference', label: 'Reference', type: 'text', col: 8, placeholder: 'Reference number' },
    { name: 'exchange_rate', label: 'Exchange Rate', type: 'number', col: 6, min: 0 },
    { name: 'export_date', label: 'Export Date', type: 'datePicker', col: 8, format: 'DD-MM-YYYY' },
    { name: 'export_country', label: 'Export Country', type: 'text', col: 8 },
    { name: 'export_document_number', label: 'Export Doc No', type: 'text', col: 8 },
    {
      name: 'items', label: 'Invoice Lines', type: 'objectArray', col: 24, headerBg: '#1a3c5e', headerColor: '#ffffff', addButtonLabel: 'Add Line',
      defaultItem: { ...emptyLine },
      columns: [
        { key: 'product_id', name: 'product_id', label: 'Product', type: 'fkSelect', width: '3fr', fkUrl: api('/api/products/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { key: 'custom_product_name', name: 'custom_product_name', label: 'Product Name', type: 'text', width: '2fr' },
        { key: 'description', name: 'description', label: 'Description', type: 'text', width: '2fr' },
        { key: 'qty', name: 'qty', label: 'Qty', type: 'number', width: '100px', min: 0 },
        { key: 'unit_price', name: 'unit_price', label: 'Unit Price', type: 'number', width: '130px', min: 0 },
        { key: 'discount_percent', name: 'discount_percent', label: 'Disc %', type: 'number', width: '100px', min: 0, max: 100 },
        { key: 'tax_rate_id', name: 'tax_rate_id', label: 'Tax Rate', type: 'fkSelect', width: '160px', fkUrl: api('/api/tax-rates/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { key: 'tax_amount', name: 'tax_amount', label: 'Tax Amt', type: 'number', width: '120px', min: 0 },
      ],
    },
    { name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 3 },
  ], []);

  const validationSchema = Yup.object().shape({
    invoice_date: Yup.string().required('Invoice date is required'),
    contact_id: Yup.string().nullable().required('Contact is required'),
    items: Yup.array().of(Yup.object().shape({
      qty: Yup.number().min(0, 'Qty must be >= 0').required('Qty required'),
      unit_price: Yup.number().min(0, 'Price must be >= 0').required('Price required'),
    })).min(1, 'At least one line is required'),
  });

  const crudInitialValues = {
    invoice_no: '', invoice_date: dayjs().format('YYYY-MM-DD'), due_date: null,
    status: 'draft', contact_id: null, currency_id: null, warehouse_id: null,
    reference: '', exchange_rate: 1, export_date: null, export_country: '', export_document_number: '',
    notes: '', items: [{ ...emptyLine }], deleted_item_ids: [],
  };

  const transformPayload = (values) => ({
    ...values,
    invoice_date: formatDate(values.invoice_date),
    due_date: formatDate(values.due_date),
    export_date: formatDate(values.export_date),
    exchange_rate: toNumber(values.exchange_rate) || 1,
    items: (values.items || []).map((r) => ({ ...r, qty: toNumber(r.qty), unit_price: toNumber(r.unit_price), discount_percent: toNumber(r.discount_percent), tax_amount: toNumber(r.tax_amount) })),
    deleted_item_ids: Array.isArray(values.deleted_item_ids) ? values.deleted_item_ids : [],
  });

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Invoices" />
      <ReusableCrud
        icon={<FileProtectOutlined />} title="Invoices"
        apiUrl={api('/api/invoices/')}
        columns={columns} fields={fields} validationSchema={validationSchema}
        crudInitialValues={crudInitialValues} transformPayload={transformPayload}
        form_ui="drawer" drawerWidth="calc(100vw - 32px)"
        searchParam="search" pageParam="page" pageSizeParam="page_size"
        sortMode="ordering" orderingParam="ordering"
        enableServerPagination={true} showSearch={true}
        canAdd={true} canEdit={true} canDelete={true} hasActions={true} hasActionColumns={true}
        anchorFilters={[
          { key: 'draft', label: 'Draft', params: { status: 'draft' } },
          { key: 'posted', label: 'Posted', params: { status: 'posted' } },
          { key: 'paid', label: 'Paid', params: { status: 'paid' } },
          { key: 'all', label: 'All', params: {} },
        ]}
        defaultAnchorKey="draft" anchorSyncWithHash
      />
    </AuthenticatedLayout>
  );
}
