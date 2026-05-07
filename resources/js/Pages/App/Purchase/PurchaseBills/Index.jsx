import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
import { FileProtectOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (v) => toNumber(v).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (v) => { if (!v) return null; const d = dayjs(v, 'DD-MM-YYYY', true); if (d.isValid()) return d.format('YYYY-MM-DD'); const d2 = dayjs(v); return d2.isValid() ? d2.format('YYYY-MM-DD') : v; };

const emptyLine = { product_id: null, custom_product_name: '', description: '', qty: 1, unit_price: 0, discount_percent: 0, tax_rate_id: null, tax_amount: 0, line_total: 0 };

const statusColors = { draft: 'default', posted: 'blue', part_paid: 'orange', paid: 'green', void: 'red' };

const calculateLineTotal = (item = {}) => {
  const gross = toNumber(item.qty) * toNumber(item.unit_price);
  const discount = (gross * toNumber(item.discount_percent)) / 100;
  return Math.max(gross - discount, 0) + toNumber(item.tax_amount);
};

export default function PurchaseBills({ auth }) {
  const columns = useMemo(() => [
    { title: 'Bill No', dataIndex: 'bill_no', key: 'bill_no' },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (v) => <Tag color={statusColors[v] || 'default'}>{v ? v.charAt(0).toUpperCase() + v.slice(1) : '-'}</Tag>,
    },
    { title: 'Bill Date', dataIndex: 'bill_date', key: 'bill_date' },
    { title: 'Due Date', dataIndex: 'due_date', key: 'due_date' },
    { title: 'Contact', dataIndex: ['contact', 'name'], key: 'contact_name', render: (v) => v || '-' },
    { title: 'Total', dataIndex: 'total', key: 'total', render: (v) => money(v), align: 'right' },
  ], []);

  const fields = useMemo(() => [
    { name: 'bill_no', label: 'Bill No', type: 'text', col: 8 },
    { name: 'bill_date', label: 'Bill Date', type: 'datePicker', col: 8, required: true },
    { name: 'due_date', label: 'Due Date', type: 'datePicker', col: 8 },
    {
      name: 'status', label: 'Status', type: 'select', col: 8,
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'posted', label: 'Posted' },
        { value: 'part_paid', label: 'Part Paid' },
        { value: 'paid', label: 'Paid' },
        { value: 'void', label: 'Void' },
      ],
    },
    { name: 'approved', label: 'Approved', type: 'switch', col: 6 },
    { name: 'contact_id', label: 'Contact', type: 'fkSelect', col: 10, required: true, fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'warehouse_id', label: 'Warehouse', type: 'fkSelect', col: 8, fkUrl: api('/api/warehouses/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'currency_id', label: 'Currency', type: 'fkSelect', col: 6, fkUrl: api('/api/currencies/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'reference', label: 'Reference', type: 'text', col: 8 },
    { name: 'exchange_rate', label: 'Exchange Rate', type: 'number', col: 6, min: 0 },
    { name: 'import_date', label: 'Import Date', type: 'datePicker', col: 8 },
    { name: 'import_country', label: 'Import Country', type: 'text', col: 8 },
    { name: 'import_document_number', label: 'Import Document No', type: 'text', col: 8 },
    { name: 'notes', label: 'Notes', type: 'textarea', col: 24 },
    {
      name: 'items', label: 'Lines', type: 'objectArray', col: 24,
      headerBg: '#1a3c5e', headerColor: '#ffffff', addButtonLabel: 'Add Line',
      defaultItem: { ...emptyLine },
      columns: [
        { key: 'product_id', name: 'product_id', label: 'Product', type: 'fkSelect', width: '3fr', fkUrl: api('/api/products/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { key: 'custom_product_name', name: 'custom_product_name', label: 'Product Name', type: 'text', width: '2fr' },
        { key: 'description', name: 'description', label: 'Description', type: 'text', width: '2fr' },
        { key: 'qty', name: 'qty', label: 'Qty', type: 'number', width: '90px', min: 0 },
        { key: 'unit_price', name: 'unit_price', label: 'Unit Price', type: 'number', width: '130px', min: 0 },
        { key: 'discount_percent', name: 'discount_percent', label: 'Disc %', type: 'number', width: '90px', min: 0, max: 100 },
        { key: 'tax_rate_id', name: 'tax_rate_id', label: 'Tax Rate', type: 'fkSelect', width: '150px', fkUrl: api('/api/tax-rates/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { key: 'tax_amount', name: 'tax_amount', label: 'Tax Amt', type: 'number', width: '110px', min: 0 },
        { key: 'line_total', name: 'line_total', label: 'Line Total', type: 'number', width: '120px', readOnly: true, formula: (row) => Number(calculateLineTotal(row).toFixed(2)) },
      ],
    },
  ], []);

  const validationSchema = Yup.object({
    bill_date: Yup.string().required('Bill date is required'),
    contact_id: Yup.mixed().required('Contact is required'),
  });

  const crudInitialValues = {
    bill_no: '',
    bill_date: dayjs().format('YYYY-MM-DD'),
    due_date: null,
    status: 'draft',
    approved: false,
    contact_id: null,
    warehouse_id: null,
    currency_id: null,
    reference: '',
    exchange_rate: 1,
    import_date: null,
    import_country: '',
    import_document_number: '',
    notes: '',
    items: [{ ...emptyLine }],
    deleted_item_ids: [],
  };

  const transformPayload = (values) => ({
    ...values,
    bill_date: formatDate(values.bill_date),
    due_date: formatDate(values.due_date),
    import_date: formatDate(values.import_date),
    exchange_rate: toNumber(values.exchange_rate),
    items: (values.items || []).map((item) => ({
      ...item,
      qty: toNumber(item.qty),
      unit_price: toNumber(item.unit_price),
      discount_percent: toNumber(item.discount_percent),
      tax_amount: toNumber(item.tax_amount),
      line_total: Number(calculateLineTotal(item).toFixed(2)),
    })),
    deleted_item_ids: values.deleted_item_ids || [],
  });

  const anchorFilters = [
    { key: 'approved', label: 'Approved', params: { approved: true } },
    { key: 'draft', label: 'Draft', params: { approved: false } },
    { key: 'all', label: 'All', params: {} },
  ];

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Purchase Bills" />
      <ReusableCrud
        title="Purchase Bills"
        icon={<FileProtectOutlined />}
        apiUrl={api('/api/purchase-bills/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        anchorFilters={anchorFilters}
        defaultAnchorKey="approved"
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
        showViewColumn
        viewPathBuilder={(record) => route('payment-out.purchase-bills.show', record.id)}
        activeTableRowFunction={(record) => ({
          onClick: (event) => {
            if (event.target.closest('button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger')) return;
            router.visit(route('payment-out.purchase-bills.show', record.id));
          },
          style: { cursor: 'pointer' },
        })}
        hasActions={true}
        hasActionColumns={true}
      />
    </AuthenticatedLayout>
  );
}
