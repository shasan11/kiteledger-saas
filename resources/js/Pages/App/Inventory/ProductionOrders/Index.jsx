import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import { Tag, Typography } from 'antd';
import * as Yup from 'yup';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const asId = (v) => { if (v === undefined || v === null || v === '') return null; if (typeof v === 'object') return v.id ?? v.value ?? null; return v; };
const money = (v) => toNumber(v).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (v) => {
  if (!v) return null;
  if (dayjs.isDayjs(v)) return v.isValid() ? v.format('YYYY-MM-DD') : null;
  const parsed = dayjs(v, ['YYYY-MM-DD', 'DD-MM-YYYY'], true);
  if (parsed.isValid()) return parsed.format('YYYY-MM-DD');
  const fallback = dayjs(v);
  return fallback.isValid() ? fallback.format('YYYY-MM-DD') : null;
};

const lineTotal = (row = {}) => toNumber(row.quantity) * toNumber(row.unit_cost);
const emptyRaw = { product_id: null, warehouse_id: null, product_unit_id: null, quantity: 1, unit_cost: 0, total_cost: 0, notes: '' };
const emptyByproduct = { product_id: null, warehouse_id: null, product_unit_id: null, quantity: 1, cost_share_percent: 0, allocated_cost: 0, unit_cost: 0, notes: '' };
const emptyExpense = { expense_account_id: null, name: '', amount: 0, notes: '' };

export default function Index({ auth }) {
  const columns = useMemo(() => [
    { title: 'Code', dataIndex: 'code', key: 'code', render: (v) => <Text strong>{v || 'DRAFT'}</Text> },
    { title: 'Date', dataIndex: 'date', key: 'date', render: (v) => v ? dayjs(v).format('DD-MM-YYYY') : '-' },
    { title: 'Finished Product', key: 'finished_product', render: (_, r) => r?.finished_product?.name || r?.finished_product_name || '-' },
    { title: 'Warehouse', key: 'warehouse', render: (_, r) => r?.warehouse?.name || r?.warehouse_name || '-' },
    { title: 'Output Qty', dataIndex: 'output_quantity', key: 'output_quantity', align: 'right' },
    { title: 'Production Cost', dataIndex: 'total_production_cost', key: 'total_production_cost', align: 'right', render: money },
    { title: 'Unit Cost', dataIndex: 'finished_goods_unit_cost', key: 'finished_goods_unit_cost', align: 'right', render: money },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v, r) => <Tag color={r?.void ? 'red' : r?.approved ? 'green' : 'default'}>{r?.void ? 'Void' : (v || 'draft')}</Tag> },
  ], []);

  const fields = useMemo(() => [
    { name: 'date', label: 'Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY' },
    { name: 'reference', label: 'Reference', type: 'text', col: 8 },
    { name: 'code', label: 'Code', type: 'text', col: 8, placeholder: 'Auto on approval', disabled: true },
    { name: 'finished_product_id', label: 'Finished Product', type: 'fkSelect', required: true, col: 12, fkUrl: api('/api/products/search'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'label' },
    { name: 'warehouse_id', label: 'Warehouse', type: 'fkSelect', required: true, col: 8, fkUrl: api('/api/warehouses/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'product_unit_id', label: 'Unit', type: 'fkSelect', col: 4, fkUrl: api('/api/product-units/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'output_quantity', label: 'Output Quantity', type: 'number', required: true, col: 8, min: 0.0001 },
    { name: 'status', label: 'Status', type: 'select', col: 8, options: [{ value: 'draft', label: 'Draft' }, { value: 'approved', label: 'Approve & Post' }] },
    { name: 'approved', label: 'Approved', type: 'switch', col: 8 },
    {
      name: 'raw_materials', label: 'Raw Materials', type: 'objectArray', col: 24, addButtonLabel: 'Add Raw Material', defaultItem: { ...emptyRaw }, headerBg: '#4b5563', headerColor: '#ffffff',
      columns: [
        { key: 'product_id', name: 'product_id', label: 'Product', type: 'fkSelect', width: '3fr', fkUrl: api('/api/products/search'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'label' },
        { key: 'warehouse_id', name: 'warehouse_id', label: 'Warehouse', type: 'fkSelect', width: '2fr', fkUrl: api('/api/warehouses/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { key: 'quantity', name: 'quantity', label: 'Qty', type: 'number', width: '100px', min: 0.0001 },
        { key: 'unit_cost', name: 'unit_cost', label: 'Unit Cost', type: 'number', width: '130px', min: 0 },
        { key: 'total_cost', name: 'total_cost', label: 'Total', type: 'number', width: '130px', readOnly: true, formula: (row) => Number(lineTotal(row).toFixed(2)) },
      ],
    },
    {
      name: 'byproducts', label: 'By-products', type: 'objectArray', col: 24, addButtonLabel: 'Add By-product', defaultItem: { ...emptyByproduct }, headerBg: '#4b5563', headerColor: '#ffffff',
      columns: [
        { key: 'product_id', name: 'product_id', label: 'Product', type: 'fkSelect', width: '3fr', fkUrl: api('/api/products/search'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'label' },
        { key: 'warehouse_id', name: 'warehouse_id', label: 'Warehouse', type: 'fkSelect', width: '2fr', fkUrl: api('/api/warehouses/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { key: 'quantity', name: 'quantity', label: 'Qty', type: 'number', width: '100px', min: 0.0001 },
        { key: 'cost_share_percent', name: 'cost_share_percent', label: 'Cost %', type: 'number', width: '100px', min: 0, max: 100 },
      ],
    },
    {
      name: 'expenses', label: 'Production Expenses', type: 'objectArray', col: 24, addButtonLabel: 'Add Expense', defaultItem: { ...emptyExpense }, headerBg: '#4b5563', headerColor: '#ffffff',
      columns: [
        { key: 'name', name: 'name', label: 'Name', type: 'text', width: '2fr' },
        { key: 'expense_account_id', name: 'expense_account_id', label: 'Account', type: 'fkSelect', width: '2fr', fkUrl: api('/api/chart-of-accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
        { key: 'amount', name: 'amount', label: 'Amount', type: 'number', width: '130px', min: 0 },
      ],
    },
    { name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 3 },
  ], []);

  const anchorFilters = useMemo(() => [
    { key: 'approved', label: 'Approved', params: { approved: true } },
    { key: 'draft', label: 'Draft', params: { approved: false, status: 'draft' } },
  ], []);

  const validationSchema = useMemo(() => Yup.object({
    date: Yup.mixed().required('Date is required'),
    finished_product_id: Yup.mixed().required('Finished product is required'),
    warehouse_id: Yup.mixed().required('Warehouse is required'),
    output_quantity: Yup.number().min(0.0001).required('Output quantity is required'),
  }), []);

  const crudInitialValues = useMemo(() => ({
    code: '', date: dayjs(), reference: '', finished_product_id: null, warehouse_id: null, product_unit_id: null, output_quantity: 1, status: 'draft', approved: false,
    raw_materials: [{ ...emptyRaw }], byproducts: [], expenses: [], notes: '',
  }), []);

  const transformPayload = (values = {}) => ({
    code: values.code || null,
    date: formatDate(values.date),
    reference: values.reference || null,
    finished_product_id: asId(values.finished_product_id),
    warehouse_id: asId(values.warehouse_id),
    product_unit_id: asId(values.product_unit_id),
    output_quantity: toNumber(values.output_quantity),
    status: values.status || 'draft',
    approved: !!values.approved || values.status === 'approved',
    raw_materials: (values.raw_materials || []).filter((row) => asId(row.product_id)).map((row) => ({ ...row, product_id: asId(row.product_id), warehouse_id: asId(row.warehouse_id), product_unit_id: asId(row.product_unit_id), quantity: toNumber(row.quantity), unit_cost: toNumber(row.unit_cost), total_cost: lineTotal(row) })),
    byproducts: (values.byproducts || []).filter((row) => asId(row.product_id)).map((row) => ({ ...row, product_id: asId(row.product_id), warehouse_id: asId(row.warehouse_id), product_unit_id: asId(row.product_unit_id), quantity: toNumber(row.quantity), cost_share_percent: toNumber(row.cost_share_percent) })),
    expenses: (values.expenses || []).filter((row) => row.name || toNumber(row.amount) > 0).map((row) => ({ ...row, expense_account_id: asId(row.expense_account_id), amount: toNumber(row.amount) })),
    notes: values.notes || null,
  });

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Production Orders" />
      <ReusableCrud
        title="Production Orders"
        apiUrl={api('/api/production-orders/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        anchorFilters={anchorFilters}
        defaultAnchorKey="approved"
        bulkActions={{ approve: true, void: true }}
        form_ui="drawer"
        drawerWidth="calc(100vw - 24px)"
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
        viewPathBuilder={(record) => route('inventory.production-orders.show', record.id)}
        onAddSuccess={(record) => router.visit(route('inventory.production-orders.show', record.id))}
      />
    </AuthenticatedLayout>
  );
}
