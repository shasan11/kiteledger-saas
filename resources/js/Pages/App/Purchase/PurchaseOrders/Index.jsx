import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
import { ShoppingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (v) => toNumber(v).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (v) => { if (!v) return null; const d = dayjs(v, 'DD-MM-YYYY', true); if (d.isValid()) return d.format('YYYY-MM-DD'); const d2 = dayjs(v); return d2.isValid() ? d2.format('YYYY-MM-DD') : v; };

const emptyLine = { product_id: null, custom_product_name: '', description: '', qty: 1, unit_price: 0, discount_percent: 0, tax_rate_id: null, tax_amount: 0 };

const statusColors = { draft: 'default', confirmed: 'blue', cancelled: 'red' };

export default function PurchaseOrders({ auth }) {
  const columns = useMemo(() => [
    { title: 'Order No', dataIndex: 'purchase_order_no', key: 'purchase_order_no' },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (v) => <Tag color={statusColors[v] || 'default'}>{v ? v.charAt(0).toUpperCase() + v.slice(1) : '-'}</Tag>,
    },
    { title: 'Date', dataIndex: 'purchase_order_date', key: 'purchase_order_date' },
    { title: 'Contact', dataIndex: ['contact', 'name'], key: 'contact_name', render: (v) => v || '-' },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', ellipsis: true },
    { title: 'Exchange Rate', dataIndex: 'exchange_rate', key: 'exchange_rate' },
    { title: 'Total', dataIndex: 'total', key: 'total', render: (v) => money(v), align: 'right' },
  ], []);

  const fields = useMemo(() => [
    { name: 'purchase_order_no', label: 'Order No', type: 'text', col: 8 },
    { name: 'purchase_order_date', label: 'Order Date', type: 'datePicker', col: 8, required: true },
    {
      name: 'status', label: 'Status', type: 'select', col: 8,
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    { name: 'contact_id', label: 'Contact', type: 'fkSelect', col: 10, required: true, fkUrl: api('/api/crm/contacts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'currency_id', label: 'Currency', type: 'fkSelect', col: 8, fkUrl: api('/api/master/currencies/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'credit_term_id', label: 'Credit Term', type: 'fkSelect', col: 8, fkUrl: api('/api/crm/credit-terms/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'exchange_rate', label: 'Exchange Rate', type: 'number', col: 6, min: 0 },
    { name: 'notes', label: 'Notes', type: 'textarea', col: 24 },
    {
      name: 'items', label: 'Lines', type: 'objectArray', col: 24,
      headerBg: '#1a3c5e', headerColor: '#ffffff', addButtonLabel: 'Add Line',
      defaultItem: { ...emptyLine },
      columns: [
        { key: 'product_id', name: 'product_id', label: 'Product', type: 'fkSelect', width: '3fr', fkUrl: api('/api/inventory/products/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { key: 'custom_product_name', name: 'custom_product_name', label: 'Product Name', type: 'text', width: '2fr' },
        { key: 'description', name: 'description', label: 'Description', type: 'text', width: '2fr' },
        { key: 'qty', name: 'qty', label: 'Qty', type: 'number', width: '90px', min: 0 },
        { key: 'unit_price', name: 'unit_price', label: 'Unit Price', type: 'number', width: '130px', min: 0 },
        { key: 'discount_percent', name: 'discount_percent', label: 'Disc %', type: 'number', width: '90px', min: 0, max: 100 },
        { key: 'tax_rate_id', name: 'tax_rate_id', label: 'Tax Rate', type: 'fkSelect', width: '150px', fkUrl: api('/api/tax/tax-rates/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { key: 'tax_amount', name: 'tax_amount', label: 'Tax Amt', type: 'number', width: '110px', min: 0 },
      ],
    },
  ], []);

  const validationSchema = Yup.object({
    purchase_order_date: Yup.string().required('Order date is required'),
    contact_id: Yup.mixed().required('Contact is required'),
  });

  const crudInitialValues = {
    purchase_order_no: '',
    purchase_order_date: dayjs().format('YYYY-MM-DD'),
    status: 'draft',
    contact_id: null,
    currency_id: null,
    credit_term_id: null,
    exchange_rate: 1,
    notes: '',
    items: [{ ...emptyLine }],
    deleted_item_ids: [],
  };

  const transformPayload = (values) => ({
    ...values,
    purchase_order_date: formatDate(values.purchase_order_date),
    exchange_rate: toNumber(values.exchange_rate),
    items: (values.items || []).map((item) => ({
      ...item,
      qty: toNumber(item.qty),
      unit_price: toNumber(item.unit_price),
      discount_percent: toNumber(item.discount_percent),
      tax_amount: toNumber(item.tax_amount),
    })),
    deleted_item_ids: values.deleted_item_ids || [],
  });

  const anchorFilters = [
    { label: 'Draft', value: 'draft' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'All', value: 'all' },
  ];

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Purchase Orders" />
      <ReusableCrud
        title="Purchase Orders"
        icon={<ShoppingOutlined />}
        apiUrl={api('/api/payment-out/purchase-orders/')}
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
