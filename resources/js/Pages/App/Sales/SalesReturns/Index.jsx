import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
import { RollbackOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (v) => toNumber(v).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (v) => { if (!v) return null; const d = dayjs(v, 'DD-MM-YYYY', true); if (d.isValid()) return d.format('YYYY-MM-DD'); const d2 = dayjs(v); return d2.isValid() ? d2.format('YYYY-MM-DD') : v; };

const statusColors = { draft: 'default', posted: 'green', cancelled: 'red' };

export default function SalesReturns({ auth }) {
  const columns = useMemo(() => [
    { title: 'Return No', dataIndex: 'sales_return_no', key: 'sales_return_no' },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (v) => <Tag color={statusColors[v] || 'default'}>{v ? v.charAt(0).toUpperCase() + v.slice(1) : '-'}</Tag>,
    },
    { title: 'Date', dataIndex: 'sales_return_date', key: 'sales_return_date' },
    { title: 'Contact', dataIndex: ['contact', 'name'], key: 'contact_name', render: (v) => v || '-' },
    { title: 'Reference', dataIndex: 'reference', key: 'reference' },
    { title: 'Total', dataIndex: 'total', key: 'total', render: (v) => money(v), align: 'right' },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', ellipsis: true },
  ], []);

  const fields = useMemo(() => [
    { name: 'sales_return_no', label: 'Return No', type: 'text', col: 8 },
    { name: 'sales_return_date', label: 'Return Date', type: 'datePicker', col: 8, required: true },
    {
      name: 'status', label: 'Status', type: 'select', col: 8,
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'posted', label: 'Posted' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    { name: 'contact_id', label: 'Contact', type: 'fkSelect', col: 10, required: true, fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'warehouse_id', label: 'Warehouse', type: 'fkSelect', col: 8, fkUrl: api('/api/warehouses/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'currency_id', label: 'Currency', type: 'fkSelect', col: 6, fkUrl: api('/api/currencies/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'reference', label: 'Reference', type: 'text', col: 8 },
    { name: 'exchange_rate', label: 'Exchange Rate', type: 'number', col: 6, min: 0 },
    {
      name: 'items', label: 'Lines', type: 'objectArray', col: 24,
      headerBg: '#1a3c5e', headerColor: '#ffffff', addButtonLabel: 'Add Line',
      defaultItem: { product_id: null, custom_product_name: '', description: '', qty: 1, unit_price: 0, tax_rate_id: null, tax_amount: 0 },
      columns: [
        { key: 'product_id', name: 'product_id', label: 'Product', type: 'fkSelect', width: '3fr', fkUrl: api('/api/products/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { key: 'custom_product_name', name: 'custom_product_name', label: 'Product Name', type: 'text', width: '2fr' },
        { key: 'description', name: 'description', label: 'Description', type: 'text', width: '2fr' },
        { key: 'qty', name: 'qty', label: 'Qty', type: 'number', width: '90px', min: 0 },
        { key: 'unit_price', name: 'unit_price', label: 'Unit Price', type: 'number', width: '130px', min: 0 },
        { key: 'tax_rate_id', name: 'tax_rate_id', label: 'Tax Rate', type: 'fkSelect', width: '150px', fkUrl: api('/api/tax-rates/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { key: 'tax_amount', name: 'tax_amount', label: 'Tax Amt', type: 'number', width: '110px', min: 0 },
      ],
    },
    { name: 'notes', label: 'Notes', type: 'textarea', col: 24 },
  ], []);

  const validationSchema = Yup.object({
    sales_return_date: Yup.string().required('Return date is required'),
    contact_id: Yup.mixed().required('Contact is required'),
  });

  const crudInitialValues = {
    sales_return_no: '',
    sales_return_date: dayjs().format('YYYY-MM-DD'),
    status: 'draft',
    contact_id: null,
    warehouse_id: null,
    currency_id: null,
    reference: '',
    exchange_rate: 1,
    notes: '',
    items: [{ product_id: null, custom_product_name: '', description: '', qty: 1, unit_price: 0, tax_rate_id: null, tax_amount: 0 }],
    deleted_item_ids: [],
  };

  const transformPayload = (values) => ({
    ...values,
    sales_return_date: formatDate(values.sales_return_date),
    exchange_rate: toNumber(values.exchange_rate),
    items: (values.items || []).map((item) => ({
      ...item,
      qty: toNumber(item.qty),
      unit_price: toNumber(item.unit_price),
      tax_amount: toNumber(item.tax_amount),
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
      <Head title="Sales Returns" />
      <ReusableCrud
        title="Sales Returns"
        icon={<RollbackOutlined />}
        apiUrl={api('/api/sales-returns/')}
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
