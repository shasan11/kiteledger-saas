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

const productTypeColors = { goods: 'blue', services: 'green', composite: 'purple' };

export default function Products({ auth }) {
  const columns = useMemo(() => [
    { title: 'Code', dataIndex: 'code', key: 'code' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    { title: 'Barcode', dataIndex: 'barcode', key: 'barcode' },
    {
      title: 'Type', dataIndex: 'product_type', key: 'product_type',
      render: (v) => v ? <Tag color={productTypeColors[v] || 'default'}>{v.charAt(0).toUpperCase() + v.slice(1)}</Tag> : '-',
    },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  ], []);

  const fields = useMemo(() => [
    { name: 'name', label: 'Name', type: 'text', col: 12, required: true },
    { name: 'code', label: 'Code', type: 'text', col: 6 },
    { name: 'sku', label: 'SKU', type: 'text', col: 6 },
    { name: 'barcode', label: 'Barcode', type: 'text', col: 8 },
    { name: 'reorder_level', label: 'Reorder Level', type: 'number', col: 8, min: 0 },
    { name: 'parent_id', label: 'Parent Product', type: 'fkSelect', col: 12, fkUrl: api('/api/inventory/products/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'product_category_id', label: 'Category', type: 'fkSelect', col: 12, fkUrl: api('/api/inventory/product-categories/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'product_unit_id', label: 'Unit', type: 'fkSelect', col: 8, fkUrl: api('/api/inventory/product-units/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'product_tax_category_id', label: 'Tax Category', type: 'fkSelect', col: 8, fkUrl: api('/api/tax/product-tax-categories/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'tax_class_id', label: 'Tax Class', type: 'fkSelect', col: 8, fkUrl: api('/api/tax/tax-class/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'sales_account_id', label: 'Sales Account', type: 'fkSelect', col: 8, fkUrl: api('/api/accounting/accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'purchase_account_id', label: 'Purchase Account', type: 'fkSelect', col: 8, fkUrl: api('/api/accounting/accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'sales_return_account_id', label: 'Sales Return Account', type: 'fkSelect', col: 8, fkUrl: api('/api/accounting/accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'purchase_return_account_id', label: 'Purchase Return Account', type: 'fkSelect', col: 8, fkUrl: api('/api/accounting/accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'purchase_price', label: 'Purchase Price', type: 'number', col: 8, min: 0 },
    { name: 'selling_price', label: 'Selling Price', type: 'number', col: 8, min: 0 },
    {
      name: 'product_type', label: 'Product Type', type: 'select', col: 8,
      options: [
        { value: 'goods', label: 'Goods' },
        { value: 'services', label: 'Services' },
        { value: 'composite', label: 'Composite' },
      ],
    },
    {
      name: 'valuation_method', label: 'Valuation Method', type: 'select', col: 8,
      options: [
        { value: 'fifo', label: 'FIFO' },
        { value: 'lifo', label: 'LIFO' },
        { value: 'weighted_average', label: 'Weighted Average' },
      ],
    },
    { name: 'track_inventory', label: 'Track Inventory', type: 'switch', col: 6 },
    { name: 'allow_sale', label: 'Allow Sale', type: 'switch', col: 6 },
    { name: 'allow_purchase', label: 'Allow Purchase', type: 'switch', col: 6 },
    { name: 'description', label: 'Description', type: 'textarea', col: 24 },
  ], []);

  const validationSchema = Yup.object({
    name: Yup.string().required('Name is required'),
  });

  const crudInitialValues = {
    name: '',
    code: '',
    sku: '',
    barcode: '',
    reorder_level: 0,
    parent_id: null,
    product_category_id: null,
    product_unit_id: null,
    product_tax_category_id: null,
    tax_class_id: null,
    sales_account_id: null,
    purchase_account_id: null,
    sales_return_account_id: null,
    purchase_return_account_id: null,
    purchase_price: 0,
    selling_price: 0,
    product_type: 'goods',
    valuation_method: 'fifo',
    track_inventory: false,
    allow_sale: true,
    allow_purchase: true,
    description: '',
  };

  const transformPayload = (values) => ({
    ...values,
    reorder_level: toNumber(values.reorder_level),
    purchase_price: toNumber(values.purchase_price),
    selling_price: toNumber(values.selling_price),
  });

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Products" />
      <ReusableCrud
        title="Products"
        icon={<ShoppingOutlined />}
        apiUrl={api('/api/inventory/products/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth={1200}
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
