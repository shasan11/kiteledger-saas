import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
import { ShoppingOutlined } from '@ant-design/icons';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function Products(props) {
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (val) => <Text strong>{val}</Text>,
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (val) => val ? <Tag color="blue">{val}</Tag> : '-',
    },
    {
      title: 'Barcode',
      dataIndex: 'barcode',
      key: 'barcode',
      render: (val) => val || '-',
    },
    {
      title: 'Category',
      dataIndex: 'productCategory',
      key: 'productCategory',
      render: (_, record) =>
        record?.productCategory?.name || record?.product_category?.name || '-',
    },
    {
      title: 'Unit',
      dataIndex: 'productUnit',
      key: 'productUnit',
      render: (_, record) => {
        const u = record?.productUnit || record?.product_unit;
        return u ? <Tag>{u.short_name || u.name}</Tag> : '-';
      },
    },
    {
      title: 'Track Inv.',
      dataIndex: 'track_inventory',
      key: 'track_inventory',
      align: 'center',
      render: (val) => <Tag color={val ? 'cyan' : 'default'}>{val ? 'Yes' : 'No'}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      sorter: true,
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>
      ),
    },
  ];

  const fields = [
    {
      name: 'name',
      label: 'Product Name',
      type: 'text',
      required: true,
      col: 12,
      placeholder: 'e.g. Laptop Pro X',
    },
    { name: 'code', label: 'Product Code', type: 'text', col: 6, placeholder: 'PRD-001' },
    { name: 'barcode', label: 'Barcode', type: 'text', col: 6, placeholder: '8901234567890' },
    {
      name: 'product_category_id',
      label: 'Category',
      type: 'fkSelect',
      col: 12,
      placeholder: 'Select category',
      fkUrl: api('/api/product-categories'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
      fkLabel: (row) => row?.name || '',
      fkExtraParams: { active: true },
    },
    {
      name: 'product_unit_id',
      label: 'Unit of Measurement',
      type: 'fkSelect',
      col: 12,
      placeholder: 'Select unit',
      fkUrl: api('/api/product-units'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
      fkLabel: (row) => row?.short_name ? `${row.name} (${row.short_name})` : row?.name || '',
      fkExtraParams: { active: true },
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      col: 24,
      rows: 3,
      placeholder: 'Optional product description',
    },
    { name: 'track_inventory', label: 'Track Inventory', type: 'switch', col: 12 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Product name is required').max(180),
    code: Yup.string().nullable().max(60),
    barcode: Yup.string().nullable().max(80),
    description: Yup.string().nullable(),
    product_category_id: Yup.string().nullable(),
    product_unit_id: Yup.string().nullable(),
    track_inventory: Yup.boolean().nullable(),
    active: Yup.boolean().nullable(),
  });

  const crudInitialValues = {
    name: '',
    code: '',
    barcode: '',
    description: '',
    product_category_id: null,
    product_unit_id: null,
    track_inventory: true,
    active: true,
    deleted_item_ids: [],
  };

  const transformPayload = (values) => {
    const p = { ...values };
    p.name = p.name?.trim() || null;
    p.code = p.code?.trim() || null;
    p.barcode = p.barcode?.trim() || null;
    p.description = p.description?.trim() || null;
    p.product_category_id = p.product_category_id || null;
    p.product_unit_id = p.product_unit_id || null;
    p.track_inventory = Boolean(p.track_inventory);
    p.active = Boolean(p.active);
    Object.keys(p).forEach((k) => p[k] === '' && (p[k] = null));
    return p;
  };

  return (
    <AuthenticatedLayout
      user={props.auth?.user}
      header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Products</h2>}
    >
      <Head title="Products" />
      <ReusableCrud
        icon={<ShoppingOutlined />}
        title="Products"
        apiUrl={api('/api/products')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth={1100}
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        activeParam="active"
        enableServerPagination={true}
        enableInactiveDrawer={true}
        showSearch={true}
        canAdd={true}
        canEdit={true}
        canDelete={true}
        hasActions={true}
        hasActionColumns={true}
        anchorFilters={[
          { key: 'all',   label: 'All Products',      title: 'Products', params: {} },
          { key: 'track', label: 'Tracked Inventory', title: 'Products', params: { track_inventory: true } },
        ]}
        defaultAnchorKey="all"
        anchorSyncWithHash
      />
    </AuthenticatedLayout>
  );
}
